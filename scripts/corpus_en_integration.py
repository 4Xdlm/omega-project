#!/usr/bin/env python3
"""
OMEGA — Corpus EN Integration Script
Cleans, renames, converts, tiers, and deploys ~260 ebooks into corpus_r/txt/
"""

import os
import re
import shutil
import glob
import traceback
from pathlib import Path

# ─── PATHS ───────────────────────────────────────────────────────────────────
SRC_DIR = Path(r"C:\Users\elric\Downloads\livre\nouverau livre EN")
CORPUS_DIR = Path(r"C:\Users\elric\omega-project\omega-autopsie\corpus_r\txt")
PYTHON = r"C:\Users\elric\AppData\Local\Programs\Python\Python311\python.exe"

# ─── STEP 1: FILES TO DELETE ─────────────────────────────────────────────────

# Incomplete downloads
CRDOWNLOAD_PATTERN = "Non confirmé*.crdownload"

# Non-English files
NON_ENGLISH = [
    "Crooner_Italian_Edition_",
    "Donkerder_-_EL_James",
    "Douce_amer_French_Edition_-_Danielle_Steel",
    "Kloof_Tussen_Twee_Werelden_-_Roberts_Nora",
    "Leal_Spanish_Edition_-_Roth_Veronica",
    "Les_cavernes_d_acier_-_isaac_asimov",
    "Opstand_Dutch_Edition_-_Veronica_Roth",
    "Robos_e_Imperio_-_Isaac_Asimov",
    "Vent_mortel_-_Cussler_Clive",
    "Titik_Muslihat_-_Dan_Brown",
    "Billy_Budd_marinaio_-_Hermann_Melville",
    "Virus_-_Cook_Robin",  # likely French
]

# Non-fiction
NON_FICTION = [
    "Asimovs_Treasury_of_Humor",
    "How_to_Write_a_Mystery",
    "Profiles_of_the_future",
    "The_Roman_Republic",
    "Space_Shuttles",
    "Reacher_the_stories_behind_the_stories",
    "The_Crimes_That_Inspired_Agatha_Christie",
    "Hogwarts_A_History",
]

# Not novels
NOT_NOVELS = [
    "Pocket_Potters_-_JK_Rowling",
    "Pocket_Potters_Hermione_Granger",
    "From_the_Wizarding_Archive",
    "From_the_wizarding_archives",
    "Harry_potter_and_the_cursed_child",
    "The_Best_American_Short_Stories",
    "Collected_Short_Fiction_-_Chet_Williamson",
    "Christmas_Fright_-_Shelby_Manuel",
    "Tossing_and_Turning_-_John_Updike",
    "The_Same_Door_-_John_Updike",
    "The_Sentinel_-_Clarke_Arthur_Charles",
    "Mother_Earth_-_Asimov_Isaac",
    "The_Sixth_Science_Fiction_Megapack",
]

# Duplicates to remove (keep the other copy)
DUPLICATES_REMOVE = [
    "call_waiting_-_r_l_stine (1).pdf",
    "Saturday_-_Ian_McEwan (1).epub",
    "The_Call_of_the_Wild_and_White_Fang_-_Jack_London (1).epub",
    "White_Teeth_-_Zadie_Smith (1).epub",
    "The_Short_Second_Life_Of_Bree_Tanner_-_Stephanie_Meyer (1).epub",
    "Cujo_5_-_Stephen_King",  # keep Cujo, remove Cujo_5
    # HP: keep philosophers_stone epub, remove sorcerer and pdf
    "Harry_Potter_and_The_Sorcerers_Stone_-_JK_Rowling",
    "Harry_Potter_and_the_socerer_stone_-_J_K_Rowling",
    "Harry_Potter_and_the_Philosophers_Stone_-_J_K_Rowling.pdf",  # keep epub
    "Harry_Potter_and_the_Goblet_of_Fire_The_Illustrated_Edition",  # illustrated dupe
    # Hitchhiker's: keep Ultimate, remove Omnibus
    "The_Hitchhikers_Guide_to_the_Galaxy_Omnibus_-_Douglas_Adams",
]

# Omnibus to remove IF individual volumes exist
# We'll handle these: check if individual volumes are present
OMNIBUS_CHECK = {
    "Edith_Wharton__The_Complete_Collection": "edith_wharton",
    "Enders_Game_Boxed_Set": "orson_scott_card",  # no individual, keep
    "The_Twilight_Saga_Complete_box_set": "stephenie_meyer",  # individual twilight/eclipse/breaking_dawn exist
    "Tom_Clancy_Collection": "tom_clancy",  # individual Hunt for Red October exists
    "The_FBI_Profiler_Series_6-Book_Bundle": "lisa_gardner",
    "The_Detective_DD_Warren_Series_5-Book_Bundle": "lisa_gardner",
    "A_Grant_County_Collection_4-6": "karin_slaughter",
    "Coldfire_The_Key_To_Midnight_Hideaway": "dean_koontz",
    "Lightning_the_Face_of_Fear_the_Vision": "dean_koontz",
    "Three_Complete_Novels_The_House_of_Thunder": "dean_koontz",
    "Three_Complete_Novels_The_Servants_of_Twilight": "dean_koontz",
    "The_Space_Trilogy_Omnibus": "arthur_c_clarke",
    "William_Styron__The_Collected_Novels": "william_styron",  # Sophie's Choice individual exists
    "The_Hogwarts_Collection": "jk_rowling",
}

# Non-docs to skip
SKIP_EXTENSIONS = [".md", ".docx"]

# ─── STEP 2: RENAME MAPPING ─────────────────────────────────────────────────
# author_title -> standardized name
# This maps the OceanofPDF filename to (author, title) for renaming

RENAME_MAP = {
    "1984_75th_anniversary_-_George_Orwell": ("george_orwell", "1984"),
    "50_shades_of_grey_-_EL_james": ("el_james", "fifty_shades_of_grey"),
    "A_Connecticut_Yankee_in_King_Arthurs_Cour_-_Mark_Twain": ("mark_twain", "a_connecticut_yankee"),
    "A_Farewell_to_Arms_-_Ernest_Hemingway": ("ernest_hemingway", "a_farewell_to_arms"),
    "A_Good_Man_Is_Hard_to_Find_and_Other_Stories_-_Flannery_OConnor": ("flannery_oconnor", "a_good_man_is_hard_to_find"),
    "A_Grant_County_Collection_4-6_-_Karin_Slaughter": ("karin_slaughter", "grant_county_collection_4_6"),
    "A_Handmaids_Tale_-_Margaret_Atwood": ("margaret_atwood", "the_handmaids_tale"),
    "A_Passage_to_India_-_E_M_Forster": ("em_forster", "a_passage_to_india"),
    "A_Room_with_a_View_-_E_M_Forster": ("em_forster", "a_room_with_a_view"),
    "A_time_to_kill_-_John_Grisham": ("john_grisham", "a_time_to_kill"),
    "Absalom_Absalom_-_William_Faulkner": ("william_faulkner", "absalom_absalom"),
    "Adventures_of_Huckleberry_Finn_Tom_Sawyers_comrade_-_Mark_Twain": ("mark_twain", "adventures_of_huckleberry_finn"),
    "Alias_Grace_-_Margaret_Atwood": ("margaret_atwood", "alias_grace"),
    "Along_Came_a_Spider_-_James_Patterson": ("james_patterson", "along_came_a_spider"),
    "American_Gods_-_Neil_Gaiman": ("neil_gaiman", "american_gods"),
    "And_Then_There_Were_None_-_Agatha_Christie": ("agatha_christie", "and_then_there_were_none"),
    "Animals_farm_-_George_Orwell": ("george_orwell", "animal_farm"),
    "Another_Country_-_James_Baldwin": ("james_baldwin", "another_country"),
    "As_I_Lay_Dying_-_William_Faulkner": ("william_faulkner", "as_i_lay_dying"),
    "Atonement_-_Ian_McEwan": ("ian_mcewan", "atonement"),
    "Babbit_-_Sinclair_Lewis": ("sinclair_lewis", "babbitt"),
    "Barchester_Towers_-_Anthony_Trollope": ("anthony_trollope", "barchester_towers"),
    "Bartleby_the_Scrivener_-_Herman_Melville": ("herman_melville", "bartleby_the_scrivener"),
    "Be_Afraid_-_Be_Very_Afraid_-_RL_Stine": ("rl_stine", "be_afraid_be_very_afraid"),
    "Before_the_Play_-_Stephen_King": ("stephen_king", "before_the_play"),
    "Bellevue_-_Robin_Cook": ("robin_cook", "bellevue"),
    "Billion_Dollar_Ransom_-_James_Patterson": ("james_patterson", "billion_dollar_ransom"),
    "Blood_Meridian_-_Cormac_McCarthy": ("cormac_mccarthy", "blood_meridian"),
    "Body_of_Evidence_-_Patricia_Cornwell": ("patricia_cornwell", "body_of_evidence"),
    "Brandon_Sandersons_Fantasy_Firsts_-_Brandon_Sanderson": ("brandon_sanderson", "fantasy_firsts"),
    "Breakfast_of_champions_-_Kurt_Vonnegt": ("kurt_vonnegut", "breakfast_of_champions"),
    "Breaking_Dawn_-_Stephanie_Meyer": ("stephenie_meyer", "breaking_dawn"),
    "Bring_Up_the_Bodies_2_-_Hilary_Mantel": ("hilary_mantel", "bring_up_the_bodies"),
    "Carrie_-_Stephen_King": ("stephen_king", "carrie"),
    "Catching_Fire_-_Suzanne_Collins": ("suzanne_collins", "catching_fire"),
    "Cathedral_-_Raymond_Carver": ("raymond_carver", "cathedral"),
    "Cats_cradle_-_Kurt_Vonnegut": ("kurt_vonnegut", "cats_cradle"),
    "Choke_-_Chuck_Palahniuk": ("chuck_palahniuk", "choke"),
    "Clear_and_Present_Danger_-_Tom_Clancy": ("tom_clancy", "clear_and_present_danger"),
    "Coldfire_The_Key_To_Midnight_Hideaway_-_Dean_Koontz": ("dean_koontz", "coldfire_key_to_midnight_hideaway"),
    "Coming_home_to_the_winter_wonderland_-_Nora_Roberts": ("nora_roberts", "coming_home_to_winter_wonderland"),
    "Counting_Miracles_A_Novel_-_Nicholas_Sparks": ("nicholas_sparks", "counting_miracles"),
    "Country_Christie_-_Agatha_Christie": ("agatha_christie", "country_christie"),
    "Creature_Teacher_-_RL_Stine": ("rl_stine", "creature_teacher"),
    "Cross_and_Sampson_-_James_Patterson_n_Brian_Sitts": ("james_patterson", "cross_and_sampson"),
    "Crossfire_-_Wilbur_Smith": ("wilbur_smith", "crossfire"),
    "Cujo_-_Stephen_King": ("stephen_king", "cujo"),
    "DIE_TRYING_-_Riviani": ("lee_child", "die_trying"),
    "Dashiell_Hammett_-_1930_The_Maltese_Falcon_-_Dashiell_Hammett": ("dashiell_hammett", "the_maltese_falcon"),
    "Death_Comes_for_the_Archbishop_-_Willa_Cather": ("willa_cather", "death_comes_for_the_archbishop"),
    "Deaths_Domain_-_Terry_Pratchett": ("terry_pratchett", "deaths_domain"),
    "DinoPark_-_Michael_Crichton": ("michael_crichton", "dinopark"),
    "Divergent_-_Veronica_Roth": ("veronica_roth", "divergent"),
    "Down_and_Out_in_Paris_and_London_-_George_Orwell": ("george_orwell", "down_and_out_in_paris_and_london"),
    "Dr_Zeus_-_James_Patterson": ("james_patterson", "dr_zeus"),
    "Dracula_-_Bram_Stoker": ("bram_stoker", "dracula"),
    "East_of_Eden_-_John_Steinbeck": ("john_steinbeck", "east_of_eden"),
    "Eclipse_-_Stephanie_Meyer": ("stephenie_meyer", "eclipse"),
    "Edith_Wharton__The_Complete_Collection_-_Edith_Wharton": ("edith_wharton", "complete_collection"),
    "Enders_Game_Boxed_Set_-_Orson_Scott_Card": ("orson_scott_card", "enders_game_boxed_set"),
    "Exit_Strategy_-_Lee_Child": ("lee_child", "exit_strategy"),
    "Eye_of_the_Needle_-_Ken_Follett": ("ken_follett", "eye_of_the_needle"),
    "Far_From_the_Madding_Crowd_-_Thomas_Hardy": ("thomas_hardy", "far_from_the_madding_crowd"),
    "Farewell_My_Lovely_-_Raymond_Chandler": ("raymond_chandler", "farewell_my_lovely"),
    "Father_Christmass_Fake_beard_-_Terry_Pratchett": ("terry_pratchett", "father_christmass_fake_beard"),
    "Fear_park_-_RL_Stine": ("rl_stine", "fear_park"),
    "Felicias_Favorites_-_Danielle_steel": ("danielle_steel", "felicias_favorites"),
    "Fifty_Shades_Darker_-_E_L_James": ("el_james", "fifty_shades_darker"),
    "Fifty_Shades_Freed_-_el_james": ("el_james", "fifty_shades_freed"),
    "Fifty_Shades_as_Told_by_Christian_Trilogy_-_E_L_James": ("el_james", "fifty_shades_as_told_by_christian"),
    "Fight_Club_-_Chuck_Palahniuk": ("chuck_palahniuk", "fight_club"),
    "For_Whom_the_Bell_Tolls_-_Ernest_Hemingway": ("ernest_hemingway", "for_whom_the_bell_tolls"),
    "Foundation_1951_-_Isaac_Asimov": ("isaac_asimov", "foundation"),
    "Frankenstein_Barnes_n_Noble_Classics_Seri_-_Mary_Wollstonecraft_Shelley": ("mary_shelley", "frankenstein"),
    "Franny_and_Zooey_-_JD_Salinger": ("jd_salinger", "franny_and_zooey"),
    "Freedom_-_Jonathan_Franzen": ("jonathan_franzen", "freedom"),
    "Genesis_-_Karin_Slaughter": ("karin_slaughter", "genesis"),
    "Genesis__Undone_-_Karin_Slaughter": ("karin_slaughter", "genesis_undone"),
    "Go_Tell_It_on_the_Mountain_-_James_Baldwin": ("james_baldwin", "go_tell_it_on_the_mountain"),
    "Gravitys_Rainbow_-_Thomas_Pynchon": ("thomas_pynchon", "gravitys_rainbow"),
    "Guards_Guards_-_Terry_Pratchett": ("terry_pratchett", "guards_guards"),
    "Half_of_a_yellow_sun_-_Chimamnda_adichie": ("chimamanda_adichie", "half_of_a_yellow_sun"),
    "Heart_of_Darkness_and_Other_Tales_-_Joseph_Conrad": ("joseph_conrad", "heart_of_darkness"),
    "Henderson_the_Rain_King_-_Saul_Bellow": ("saul_bellow", "henderson_the_rain_king"),
    "Herzog_-_Saul_Bellow": ("saul_bellow", "herzog"),
    "Hidden_Nature_-_Nora_Roberts": ("nora_roberts", "hidden_nature"),
    "Hot_ice_-_By_nora_roberts": ("nora_roberts", "hot_ice"),
    "House_of_Two_Pharaohs_-_Wilbur_Smith": ("wilbur_smith", "house_of_two_pharaohs"),
    "Housekeeping_-_Marilynne_Robinson": ("marilynne_robinson", "housekeeping"),
    "Howards_End_-_EM_Forster": ("em_forster", "howards_end"),
    "I_am_your_evil_twin_-_RL_Stine": ("rl_stine", "i_am_your_evil_twin"),
    "In_the_Garden_of_the_North_American_Martyr_-_Tobias_Wolff": ("tobias_wolff", "in_the_garden_of_the_north_american_martyrs"),
    "Independence_Day_-_Richard_Ford": ("richard_ford", "independence_day"),
    "Infinite_Jest_-_David_Foster_Wallace": ("david_foster_wallace", "infinite_jest"),
    "Inner_harbour_-_Nora_roberts": ("nora_roberts", "inner_harbour"),
    "Intensity_-_Dean_Koontz": ("dean_koontz", "intensity"),
    "It_Ends_with_Us_-_Colleen_Hoover": ("colleen_hoover", "it_ends_with_us"),
    "Jazz_-_Toni_Morrison": ("toni_morrison", "jazz"),
    "Jeeves_in_the_offing_-_PG_Wodehouse": ("pg_wodehouse", "jeeves_in_the_offing"),
    "Jesus_Son_-_Denis_Johnson": ("denis_johnson", "jesus_son"),
    "Jude_the_Obscure_-_Thomas_Hardy": ("thomas_hardy", "jude_the_obscure"),
    "Kaleidoscope_-_Danielle_steele": ("danielle_steel", "kaleidoscope"),
    "Killing_Floor_-_Lee_Child": ("lee_child", "killing_floor"),
    "Kim_-_Rudyard_Kipling": ("rudyard_kipling", "kim"),
    "Kiss_her_goodbye_-_Lisa_Gardner": ("lisa_gardner", "kiss_her_goodbye"),
    "Lady_Chatterleys_Lover_-_DH_Lawrence": ("dh_lawrence", "lady_chatterleys_lover"),
    "Libra_-_Don_Delillo": ("don_delillo", "libra"),
    "Light_in_August_-_William_Faulkner": ("william_faulkner", "light_in_august"),
    "Lightning_the_Face_of_Fear_the_Vision_-_Dean_Koontz": ("dean_koontz", "lightning_face_of_fear_vision"),
    "Lila_-_Marilynne_Robinson": ("marilynne_robinson", "lila"),
    "Little_Women_2023_reissue_-_Louisa_May_Alcott": ("louisa_may_alcott", "little_women"),
    "Lord_Jim_n_Nostromo_-_Joseph_Conrad": ("joseph_conrad", "lord_jim_and_nostromo"),
    "Main_Street_-_Sinclair_Lewis": ("sinclair_lewis", "main_street"),
    "Mamma_Be_My_Valentine_-_Lisa_Gardner": ("lisa_gardner", "mamma_be_my_valentine"),
    "Martin_Eden_-_Jack_London": ("jack_london", "martin_eden"),
    "Mason_n_Dixon_-_Thomas_Pynchon": ("thomas_pynchon", "mason_and_dixon"),
    "Master_of_the_Game_-_Sidney_Sheldon": ("sidney_sheldon", "master_of_the_game"),
    "Middlemarch_-_George_Eliot": ("george_eliot", "middlemarch"),
    "Middlesex_-_Jeffrey_Eugenides": ("jeffrey_eugenides", "middlesex"),
    "Mockingjay_-_Suzanne_Collins": ("suzanne_collins", "mockingjay"),
    "Mrs_Dalloway_in_Bond_Street_-_Virginia_Woolf": ("virginia_woolf", "mrs_dalloway"),
    "Murder_on_the_Orient_Express_-_Agatha_Christie": ("agatha_christie", "murder_on_the_orient_express"),
    "My_Antonia_-_Willa_Cather": ("willa_cather", "my_antonia"),
    "My_Cousin_Rachel_-_Daphne_du_Maurier": ("daphne_du_maurier", "my_cousin_rachel"),
    "My_friends_call_me_monster_-_RL_Stine": ("rl_stine", "my_friends_call_me_monster"),
    "Naked_Lunch_-_William_S_Burroughs": ("william_burroughs", "naked_lunch"),
    "Necessary_Women_and_the_Mean_Time_-_Karin_Slaughter": ("karin_slaughter", "necessary_women_and_the_mean_time"),
    "Never_Let_Me_Go_-_Kazuo_Ishiguro": ("kazuo_ishiguro", "never_let_me_go"),
    "Never_Say_Die_-_James_Patterson": ("james_patterson", "never_say_die"),
    "Neverwhere_-_Neil_Gaiman": ("neil_gaiman", "neverwhere"),
    "Nightmare_Hour_Time_for_Terror_-_RL_Stine": ("rl_stine", "nightmare_hour"),
    "Nightshade_Night_Tales_Book_3_-_Nora_Roberts": ("nora_roberts", "nightshade"),
    "No_Country_for_Old_Men_-_Cormac_McCarthy": ("cormac_mccarthy", "no_country_for_old_men"),
    "Not_Forever_But_For_Now_-_Chuck_Palahniuk": ("chuck_palahniuk", "not_forever_but_for_now"),
    "OF_TIME_AND_THE_RIVER_-_Thomas_Wolfe": ("thomas_wolfe", "of_time_and_the_river"),
    "Of_mice_and_men_-_John_Steinbeck": ("john_steinbeck", "of_mice_and_men"),
    "On_Chesil_Beach_-_Ian_McEwan": ("ian_mcewan", "on_chesil_beach"),
    "On_the_Road_-_Jack_Kerouac": ("jack_kerouac", "on_the_road"),
    "One_Night_in_Payne_House_-_RL_Stine": ("rl_stine", "one_night_in_payne_house"),
    "One_Step_Too_Far_-_Lisa_Gardner": ("lisa_gardner", "one_step_too_far"),
    "One_for_the_Money_-_Janet_Evanovich": ("janet_evanovich", "one_for_the_money"),
    "Orlando_-_Virginia_Woolf": ("virginia_woolf", "orlando"),
    "Pelican_Brief_-_John_Grisham": ("john_grisham", "the_pelican_brief"),
    "Pillars_of_the_Earth_-_Ken_Follet": ("ken_follett", "pillars_of_the_earth"),
    "Portnoys_Complaint_-_Philip_Roth": ("philip_roth", "portnoys_complaint"),
    "Postmortem_-_Patricia_Daniels_Cornwell": ("patricia_cornwell", "postmortem"),
    "Prey_Zone_The_Scorpions_Sting_-_Wilbur_Smith": ("wilbur_smith", "prey_zone_scorpions_sting"),
    "Purple_Hibiscus_-_Chimamanda_Ngozi_Adichie": ("chimamanda_adichie", "purple_hibiscus"),
    "Rabbit_Redux_-_John_Updike": ("john_updike", "rabbit_redux"),
    "Raise_the_Titanic_-_Clive_Cussler": ("clive_cussler", "raise_the_titanic"),
    "Red_Harvest_-_Dashiell_Hammett": ("dashiell_hammett", "red_harvest"),
    "Remain_-_Nicholas_sparks_and_M_Night": ("nicholas_sparks", "remain"),
    "Rendevous_With_Rama_-_Arthur_C_Clarke": ("arthur_c_clarke", "rendezvous_with_rama"),
    "Resurrection_-_Danielle_Steel": ("danielle_steel", "resurrection"),
    "Robert_Langdon_5_Origin_in_engilsh_-_Dan_Brown": ("dan_brown", "origin"),
    "Royale_-_Danielle_Steel": ("danielle_steel", "royale"),
    "Sahara_-_Clive_Cussler": ("clive_cussler", "sahara"),
    "Saturday_-_Ian_McEwan": ("ian_mcewan", "saturday"),
    "Scary_Birthday_to_You_-_RL_Stine": ("rl_stine", "scary_birthday_to_you"),
    "Seven_Rings_-_Nora_Roberts": ("nora_roberts", "seven_rings"),
    "Shirley_Jackson_-_The_Haunting_Of_Hill_Hou_-_Shirley_Jackson": ("shirley_jackson", "the_haunting_of_hill_house"),
    "Silas_Marner_-_George_Eliot": ("george_eliot", "silas_marner"),
    "Sister_Carrie_BnN_-_Theodore_Dreiser": ("theodore_dreiser", "sister_carrie"),
    "Slaughterhouse-Five_-_Kurt_Vonnegut_Jr": ("kurt_vonnegut", "slaughterhouse_five"),
    "Small_Gods_-_Terry_Pratchett": ("terry_pratchett", "small_gods"),
    "Song_of_Solomon_-_Toni_Morrison": ("toni_morrison", "song_of_solomon"),
    "Sons_and_Lovers_-_DH_Lawrence": ("dh_lawrence", "sons_and_lovers"),
    "Sophies_Choice_-_William_Styron": ("william_styron", "sophies_choice"),
    "Spasm_-_Robin_cook": ("robin_cook", "spasm"),
    "Sphere_-_Michael_Crichton": ("michael_crichton", "sphere"),
    "Still_See_You_Everywhere_-_Lisa_Gardner": ("lisa_gardner", "still_see_you_everywhere"),
    "Sula_-_Toni_Morrison": ("toni_morrison", "sula"),
    "Suttree_-_Cormac_McCarthy": ("cormac_mccarthy", "suttree"),
    "THE_MANNER_OF_DEATH_-_Robin_Cook": ("robin_cook", "the_manner_of_death"),
    "Tender_is_the_Night_-_F_Scott_Fitzgerald": ("f_scott_fitzgerald", "tender_is_the_night"),
    "Tess_of_the_Durbervilles_-_Thomas_Hardy": ("thomas_hardy", "tess_of_the_durbervilles"),
    "The_13th_Warning_-_RL_Stine": ("rl_stine", "the_13th_warning"),
    "The_Abominable_Snowman_-_Terry_Pratchett": ("terry_pratchett", "the_abominable_snowman"),
    "The_Adventures_of_Augie_March_-_Saul_Bellow": ("saul_bellow", "the_adventures_of_augie_march"),
    "The_Amazing_Adventures_of_Kavalier_n_Clay_-_Michael_Chabon": ("michael_chabon", "the_amazing_adventures_of_kavalier_and_clay"),
    "The_Andromeda_Strain_-_Michael_Crichton": ("michael_crichton", "the_andromeda_strain"),
    "The_Annotated_Treasure_Island_-_Robert_Louis_Stevenson": ("robert_louis_stevenson", "treasure_island"),
    "The_Big_Sleep_-_Raymond_Chandler": ("raymond_chandler", "the_big_sleep"),
    "The_Bourne_Identity_-_Robert_Ludlum": ("robert_ludlum", "the_bourne_identity"),
    "The_Bourne_Legacy_-_Robert_Ludlum_n_Eric_van_Lustbader": ("robert_ludlum", "the_bourne_legacy"),
    "The_Bourne_Supremacy_-_Robert_Ludlum": ("robert_ludlum", "the_bourne_supremacy"),
    "The_Butler_-_Danielle_Steel": ("danielle_steel", "the_butler"),
    "The_Call_of_the_Wild_and_White_Fang_-_Jack_London": ("jack_london", "the_call_of_the_wild_and_white_fang"),
    "The_Catcher_in_the_Rye_-_JD_Salinger": ("jd_salinger", "the_catcher_in_the_rye"),
    "The_Collected_Stories_-_Amy_Hempel": ("amy_hempel", "the_collected_stories"),
    "The_Coup_-_John_Updike": ("john_updike", "the_coup"),
    "The_Crying_of_Lot_49_-_Thomas_Pynchon": ("thomas_pynchon", "the_crying_of_lot_49"),
    "The_Detective_DD_Warren_Series_5-Book_Bundle_-_Lisa_Gardner": ("lisa_gardner", "dd_warren_series_bundle"),
    "The_Devils_Daughter_-_Danielle_Steel": ("danielle_steel", "the_devils_daughter"),
    "The_End_of_the_Affair_-_Graham_Greene": ("graham_greene", "the_end_of_the_affair"),
    "The_FBI_Profiler_Series_6-Book_Bundle_-_Lisa_Gardner": ("lisa_gardner", "fbi_profiler_series_bundle"),
    "The_Firm_-_John_Grisham": ("john_grisham", "the_firm"),
    "The_Friend_of_the_Family_-_Dean_Koontz": ("dean_koontz", "the_friend_of_the_family"),
    "The_Goldfinch_-_Donna_Tartt": ("donna_tartt", "the_goldfinch"),
    "The_Grapes_of_Wrath_-_John_Steinbeck": ("john_steinbeck", "the_grapes_of_wrath"),
    "The_Great_Gatsby_-_Fitzgerald": ("f_scott_fitzgerald", "the_great_gatsby"),
    "The_Grey_Ghost_Fargo_Adventure_10_-_Clive_Cussler": ("clive_cussler", "the_grey_ghost"),
    "The_Heart_Is_a_Lonely_Hunter_-_Carson_McCullers": ("carson_mccullers", "the_heart_is_a_lonely_hunter"),
    "The_Hitchhikers_Guide_to_the_Galaxy_Omnibus_-_Douglas_Adams": ("douglas_adams", "hitchhikers_guide_omnibus"),
    "The_Hogwarts_Collection_-_J_K_Rowling": ("jk_rowling", "the_hogwarts_collection"),
    "The_House_of_Mirth_-_Edith_Wharton": ("edith_wharton", "the_house_of_mirth"),
    "The_House_of_the_Seven_Gables_-_Nathaniel_Hawthorne": ("nathaniel_hawthorne", "the_house_of_the_seven_gables"),
    "The_Human_Stain_-_Philip_Roth": ("philip_roth", "the_human_stain"),
    "The_Hunt_for_Red_October_-_Tom_Clancy_Mark_Greaney_Marc_Cameron": ("tom_clancy", "the_hunt_for_red_october"),
    "The_Husband_-_Koontz_Dean_Ray": ("dean_koontz", "the_husband"),
    "The_Invention_of_Sound_-_Chuck_Palahniuk": ("chuck_palahniuk", "the_invention_of_sound"),
    "The_Island_of_Dr_Moreau_-_H_G_Wells": ("hg_wells", "the_island_of_dr_moreau"),
    "The_Jungle_-_Upton_Sinclair": ("upton_sinclair", "the_jungle"),
    "The_Left_Hand_of_Darkness_-_Ursula_Le_Guin": ("ursula_le_guin", "the_left_hand_of_darkness"),
    "The_Lightning_Thief_Illustrated_Edition_-_Rick_Riordan": ("rick_riordan", "the_lightning_thief"),
    "The_Lost_Symbol_-Special_Illustrated_Edition_https_-_Dan_Brown": ("dan_brown", "the_lost_symbol"),
    "The_Martian_-_Andy_Weir": ("andy_weir", "the_martian"),
    "The_Member_of_the_Wedding_-_Carson_McCullers": ("carson_mccullers", "the_member_of_the_wedding"),
    "The_Mill_on_the_Floss_-_George_1819-1880_Eliot": ("george_eliot", "the_mill_on_the_floss"),
    "The_Other_Side_of_Midnight_-_Sidney_Sheldon": ("sidney_sheldon", "the_other_side_of_midnight"),
    "The_Pale_King__An_Unfinished_Novel_-_David_Foster_Wallace": ("david_foster_wallace", "the_pale_king"),
    "The_Picture_of_Dorian_Gray_-_Oscar_Wilde": ("oscar_wilde", "the_picture_of_dorian_gray"),
    "The_Portrait_of_a_Lady_-_Roger_Luckhurst_Henry_James": ("henry_james", "the_portrait_of_a_lady"),
    "The_Power_and_the_Glory_-_Graham_Greene": ("graham_greene", "the_power_and_the_glory"),
    "The_Quiet_American_-_Graham_Greene": ("graham_greene", "the_quiet_american"),
    "The_Quinns_christmas_-_Nora_roberts": ("nora_roberts", "the_quinns_christmas"),
    "The_Same_Door_-_John_Updike": ("john_updike", "the_same_door"),
    "The_Scarlet_Letter_and_Other_Writings_-_Nathaniel_Hawthorne": ("nathaniel_hawthorne", "the_scarlet_letter"),
    "The_Secret_History_-_Donna_Tartt": ("donna_tartt", "the_secret_history"),
    "The_Secret_of_Secrets_-_Dan_Brown": ("dan_brown", "the_secret_of_secrets"),
    "The_Serpents_Lair_-_Prey_Zone_Books_-_Wilbur_Smith": ("wilbur_smith", "the_serpents_lair"),
    "The_Shadow_-_James_Patterson": ("james_patterson", "the_shadow"),
    "The_Short_Second_Life_of_Bree_Tanner_-_Stephanie_Meyer": ("stephenie_meyer", "the_short_second_life_of_bree_tanner"),
    "The_Solomon_Curse_-_Clive_Cussler": ("clive_cussler", "the_solomon_curse"),
    "The_Sound_and_the_Fury_-_William_Faulkner": ("william_faulkner", "the_sound_and_the_fury"),
    "The_Space_Trilogy_Omnibus_-_Arthur_C_Clarke": ("arthur_c_clarke", "the_space_trilogy_omnibus"),
    "The_Sportswriter_-_Richard_Ford": ("richard_ford", "the_sportswriter"),
    "The_Spy_Who_Came_in_from_the_Cold_-_John_le_Carre": ("john_le_carre", "the_spy_who_came_in_from_the_cold"),
    "The_Strange_Case_of_Dr_Jekyll_and_Mr_Hyde_Weir_of_Hermiston_-_Robert_Louis_Stevenson": ("robert_louis_stevenson", "dr_jekyll_and_mr_hyde"),
    "The_Sun_Also_Rises_-_Ernest_Hemingway": ("ernest_hemingway", "the_sun_also_rises"),
    "The_Time_Machine_n_The_Invisible_Man_-_H_G_Wells": ("hg_wells", "the_time_machine_and_the_invisible_man"),
    "The_Tuesday_Club_Murders_and_Other_Stories_-_Agatha_Christie": ("agatha_christie", "the_tuesday_club_murders"),
    "The_Turn_of_the_Screw_-_Henry_James": ("henry_james", "the_turn_of_the_screw"),
    "The_Twilight_Saga_Complete_box_set_-_Stephenie_Meyer": ("stephenie_meyer", "the_twilight_saga_complete"),
    "The_Ultimate_Hitchhikers_Guide_to_the_Galaxy_Omnibus_-_Douglas_Adams": ("douglas_adams", "the_ultimate_hitchhikers_guide"),
    "The_Virgin_Suicides_-_Jeffrey_Eugenides": ("jeffrey_eugenides", "the_virgin_suicides"),
    "The_War_of_the_Worlds_-_HG_Wells": ("hg_wells", "the_war_of_the_worlds"),
    "The_Way_We_Live_Now_-_Anthony_Trollope": ("anthony_trollope", "the_way_we_live_now"),
    "The_Wish_-_Nicolas_Sparks": ("nicholas_sparks", "the_wish"),
    "The_Wolf_Hall_Picture_Book_-_Hilary_Mantel": ("hilary_mantel", "wolf_hall"),
    "The_House_of_Mirth_-_Edith_Wharton": ("edith_wharton", "the_house_of_mirth"),
    "The_invisible_man_-_Ralph_Ellison": ("ralph_ellison", "invisible_man"),
    "The_kiss_-_Danielle_steels": ("danielle_steel", "the_kiss"),
    "The_missus_-_E_L_james": ("el_james", "the_missus"),
    "The_neighbour_-_Lisa_gardner": ("lisa_gardner", "the_neighbour"),
    "The_old_man_and_the_sea_-_Earnest_Hemingway": ("ernest_hemingway", "the_old_man_and_the_sea"),
    "The_portrait_-_Danielle_steel": ("danielle_steel", "the_portrait"),
    "The_remains_of_the_day_-_Kazou_ishiguro": ("kazuo_ishiguro", "the_remains_of_the_day"),
    "This_Boys_Life_-_Tobias_Wolff": ("tobias_wolff", "this_boys_life"),
    "This_is_Why_We_Lied_-_Karin_Slaughter": ("karin_slaughter", "this_is_why_we_lied"),
    "Three_Complete_Novels_The_House_of_Thunder_Shadowfires_Midnight_-_Dean_Koontz": ("dean_koontz", "three_novels_house_of_thunder"),
    "Three_Complete_Novels_The_Servants_of_Twilight__Darkfall__Phantoms_-_Dean_Koontz": ("dean_koontz", "three_novels_servants_of_twilight"),
    "Tinker_Tailor_Soldier_Spy_-_John_le_Carre": ("john_le_carre", "tinker_tailor_soldier_spy"),
    "To_kill_a_mocking_bird_-_Haper_Lee": ("harper_lee", "to_kill_a_mockingbird"),
    "To_the_lighthouse_-_Virginia_Woolf": ("virginia_woolf", "to_the_lighthouse"),
    "Tom_Clancy_Collection_-_Tom_Clancy": ("tom_clancy", "collection"),
    "Tree_of_Smoke_-_Denis_Johnson": ("denis_johnson", "tree_of_smoke"),
    "Twilight_saga_-_Stephanie_Meyer": ("stephenie_meyer", "twilight"),
    "Two_for_the_Dough_-_Janet_Evanovich": ("janet_evanovich", "two_for_the_dough"),
    "Ugly_love_-_Colleen_hoover": ("colleen_hoover", "ugly_love"),
    "Underworld_-_Don_Delillo": ("don_delillo", "underworld"),
    "We_Have_Always_Lived_in_the_Castle_-_Shirley_Jackson": ("shirley_jackson", "we_have_always_lived_in_the_castle"),
    "We_are_all_guilty_here_-_Karin_Slaughter": ("karin_slaughter", "we_are_all_guilty_here"),
    "Weekend_at_Poison_Lake_-_RL_Stine": ("rl_stine", "weekend_at_poison_lake"),
    "What_We_Talk_About_When_We_Talk_About_Love_-_Raymond_Carver": ("raymond_carver", "what_we_talk_about_when_we_talk_about_love"),
    "White_Noise_-_Don_Delillo": ("don_delillo", "white_noise"),
    "White_Teeth_-_Zadie_Smith": ("zadie_smith", "white_teeth"),
    "William_Styron__The_Collected_Novels__Lie_-_William_Styron": ("william_styron", "collected_novels"),
    "Wings_of_the_Dove_-_Henry_James": ("henry_james", "the_wings_of_the_dove"),
    "Women_in_love_-_D_H_Laurence": ("dh_lawrence", "women_in_love"),
    "Wuthering_Heights_-_Emily_Bronte": ("emily_bronte", "wuthering_heights"),
    "call_waiting_-_r_l_stine": ("rl_stine", "call_waiting"),
    "harry_potter_and_the_philosophers_stone_-_JK_Rowling": ("jk_rowling", "harry_potter_and_the_philosophers_stone"),
}

# ─── STEP 4: TIERING ────────────────────────────────────────────────────────
TIER_S = [
    "ernest_hemingway", "raymond_carver", "cormac_mccarthy",
    "kurt_vonnegut", "jd_salinger", "george_orwell",
    "jack_london", "dashiell_hammett", "raymond_chandler",
    "flannery_oconnor", "tobias_wolff", "denis_johnson",
    "amy_hempel", "richard_ford", "william_faulkner",
    "henry_james", "virginia_woolf", "thomas_pynchon",
    "toni_morrison", "james_baldwin", "saul_bellow",
    "philip_roth", "don_delillo", "david_foster_wallace",
    "thomas_wolfe", "ralph_ellison", "william_styron",
    "f_scott_fitzgerald", "john_steinbeck", "harper_lee",
    "mark_twain", "edith_wharton", "willa_cather",
    "carson_mccullers", "shirley_jackson", "marilynne_robinson",
    "donna_tartt", "ian_mcewan", "kazuo_ishiguro", "hilary_mantel",
]
# Special: chuck_palahniuk_fight_club is S, others are B
# Special: john_updike_rabbit_* is S, the_coup is acceptable

TIER_A = [
    "graham_greene", "em_forster", "anthony_trollope",
    "george_eliot", "charlotte_bronte", "emily_bronte",
    "thomas_hardy", "joseph_conrad", "dh_lawrence",
    "nathaniel_hawthorne", "herman_melville", "louisa_may_alcott",
    "oscar_wilde", "robert_louis_stevenson", "zadie_smith",
    "jonathan_franzen", "michael_chabon", "jeffrey_eugenides",
    "chimamanda_adichie", "jack_kerouac",
]
# george_orwell_animal_farm -> A

TIER_B = [
    "hg_wells", "bram_stoker", "mary_shelley", "rudyard_kipling",
    "william_burroughs", "sinclair_lewis", "theodore_dreiser",
    "upton_sinclair", "daphne_du_maurier", "pg_wodehouse",
    "john_le_carre", "margaret_atwood", "neil_gaiman",
    "ursula_le_guin", "agatha_christie", "arthur_c_clarke",
    "terry_pratchett", "douglas_adams",
    "stephen_king", "ken_follett",
]
# isaac_asimov_foundation -> B
# chuck_palahniuk_choke, not_forever, invention_of_sound -> B

TIER_C = [
    "john_grisham", "michael_crichton", "robin_cook",
    "sidney_sheldon", "robert_ludlum", "suzanne_collins",
    "veronica_roth", "rick_riordan", "jk_rowling",
    "colleen_hoover", "karin_slaughter", "lisa_gardner",
    "patricia_cornwell", "andy_weir", "brandon_sanderson",
    "orson_scott_card",
]

TIER_D = [
    "stephenie_meyer", "el_james", "dan_brown",
    "james_patterson", "nicholas_sparks", "danielle_steel",
    "clive_cussler", "tom_clancy", "janet_evanovich",
    "nora_roberts", "dean_koontz", "wilbur_smith",
    "lee_child", "rl_stine",
]


def get_tier(author, title):
    """Assign tier based on author and special cases."""
    # Special cases
    if author == "chuck_palahniuk":
        if title == "fight_club":
            return "S"
        return "B"  # choke, not_forever, invention_of_sound
    if author == "john_updike":
        if "rabbit" in title:
            return "S"
        return "S"  # the_coup is acceptable as novel
    if author == "george_orwell":
        if title == "animal_farm":
            return "A"
        return "S"  # 1984, down_and_out
    if author == "isaac_asimov":
        if title == "foundation":
            return "B"
        return "B"
    if author == "stephen_king":
        # Minor works = C, major = B
        minor = ["carrie", "cujo", "before_the_play"]
        if title in minor:
            return "C"
        return "B"

    # Standard lookup
    if author in TIER_S:
        return "S"
    if author in TIER_A:
        return "A"
    if author in TIER_B:
        return "B"
    if author in TIER_C:
        return "C"
    if author in TIER_D:
        return "D"
    return "?"


def should_exclude(filename):
    """Check if file should be excluded."""
    name_no_prefix = filename.replace("_OceanofPDF.com_", "")

    # crdownload
    if filename.endswith(".crdownload"):
        return "crdownload"

    # Non-doc files
    ext = os.path.splitext(filename)[1].lower()
    if ext in [".md", ".docx"]:
        return "not_ebook"

    # Non-English
    for pattern in NON_ENGLISH:
        if pattern in name_no_prefix:
            return "non_english"

    # Non-fiction
    for pattern in NON_FICTION:
        if pattern in name_no_prefix:
            return "non_fiction"

    # Not novels
    for pattern in NOT_NOVELS:
        if pattern in name_no_prefix:
            return "not_novel"

    # Duplicates
    for pattern in DUPLICATES_REMOVE:
        if pattern in filename:
            return "duplicate"

    return None


def strip_prefix(filename):
    """Remove _OceanofPDF.com_ prefix."""
    return re.sub(r'^_OceanofPDF\.com_', '', filename)


def get_standard_name(filename):
    """Get standardized author_title name from filename."""
    name_no_prefix = strip_prefix(filename)
    base, ext = os.path.splitext(name_no_prefix)

    # Try exact match in RENAME_MAP
    if base in RENAME_MAP:
        author, title = RENAME_MAP[base]
        return f"{author}_{title}", ext.lower()

    # Fallback: try to parse Author_-_Title pattern
    # Clean up and lowercase
    clean = base.lower().replace(" ", "_")
    return clean, ext.lower()


def convert_epub_to_txt(epub_path):
    """Convert epub to text using ebooklib."""
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
    import warnings
    warnings.filterwarnings('ignore')

    try:
        book = epub.read_epub(str(epub_path), options={'ignore_ncx': True})
        text_parts = []
        for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            text_parts.append(soup.get_text(separator='\n'))
        return '\n\n'.join(text_parts)
    except Exception as e:
        return None


def convert_pdf_to_txt(pdf_path):
    """Convert PDF to text using pdfplumber."""
    import pdfplumber

    try:
        with pdfplumber.open(str(pdf_path)) as pdf:
            pages = []
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return '\n\n'.join(pages)
    except Exception as e:
        return None


def main():
    print("=" * 70)
    print("OMEGA — CORPUS EN INTEGRATION")
    print("=" * 70)

    # Ensure corpus dir exists
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)

    # Get all files
    all_files = os.listdir(SRC_DIR)
    print(f"\nTotal files in source: {len(all_files)}")

    # ── STEP 1: Classify files ───────────────────────────────────────────
    excluded = {"crdownload": [], "non_english": [], "non_fiction": [],
                "not_novel": [], "duplicate": [], "not_ebook": []}
    kept = []

    for f in sorted(all_files):
        reason = should_exclude(f)
        if reason:
            excluded[reason].append(f)
        else:
            kept.append(f)

    # ── Handle omnibus: remove if individual volumes exist ────────────────
    # Check which authors have individual volumes
    kept_authors = {}
    for f in kept:
        name_no_prefix = strip_prefix(f)
        base = os.path.splitext(name_no_prefix)[0]
        if base in RENAME_MAP:
            author, title = RENAME_MAP[base]
            if author not in kept_authors:
                kept_authors[author] = []
            kept_authors[author].append((f, title))

    omnibus_removed = []
    for f in kept[:]:  # iterate copy
        name_no_prefix = strip_prefix(f)
        base = os.path.splitext(name_no_prefix)[0]
        for omnibus_key, author_key in OMNIBUS_CHECK.items():
            if omnibus_key in base:
                # Check if this author has individual volumes
                individual_count = 0
                if author_key in kept_authors:
                    for kf, ktitle in kept_authors[author_key]:
                        if kf != f:  # don't count self
                            individual_count += 1
                if individual_count > 0:
                    kept.remove(f)
                    omnibus_removed.append(f)
                    break

    print(f"\n── STEP 1: EXCLUSIONS ──")
    print(f"  Incomplete downloads: {len(excluded['crdownload'])}")
    print(f"  Non-English: {len(excluded['non_english'])}")
    print(f"  Non-fiction: {len(excluded['non_fiction'])}")
    print(f"  Not novels: {len(excluded['not_novel'])}")
    print(f"  Duplicates: {len(excluded['duplicate'])}")
    print(f"  Not ebooks: {len(excluded['not_ebook'])}")
    print(f"  Omnibus (individual exists): {len(omnibus_removed)}")
    total_excluded = sum(len(v) for v in excluded.values()) + len(omnibus_removed)
    print(f"  TOTAL EXCLUDED: {total_excluded}")
    print(f"  KEPT: {len(kept)}")

    # ── STEP 2-3: Rename + Convert ───────────────────────────────────────
    print(f"\n── STEPS 2-3: RENAME + CONVERT ──")
    converted = []
    failed = []
    tier_counts = {"S": 0, "A": 0, "B": 0, "C": 0, "D": 0, "?": 0}

    for f in sorted(kept):
        src_path = SRC_DIR / f
        std_name, ext = get_standard_name(f)
        txt_name = std_name + ".txt"
        txt_path = CORPUS_DIR / txt_name

        # Skip if already exists in corpus
        if txt_path.exists():
            print(f"  SKIP (exists): {txt_name}")
            # Still count tier
            if std_name in [f"{a}_{t}" for base, (a, t) in RENAME_MAP.items()]:
                pass
            continue

        # Convert
        text = None
        if ext == ".epub":
            text = convert_epub_to_txt(src_path)
        elif ext == ".pdf":
            text = convert_pdf_to_txt(src_path)
        else:
            print(f"  SKIP (unknown ext): {f} -> {ext}")
            continue

        if text and len(text.strip()) > 500:  # minimum viable text
            # Get tier
            name_no_prefix = strip_prefix(f)
            base = os.path.splitext(name_no_prefix)[0]
            if base in RENAME_MAP:
                author, title = RENAME_MAP[base]
            else:
                author = std_name.split("_")[0] if "_" in std_name else std_name
                title = std_name
            tier = get_tier(author, title)
            tier_counts[tier] += 1

            # Write
            with open(txt_path, 'w', encoding='utf-8') as out:
                out.write(text)

            size_kb = len(text) / 1024
            converted.append((txt_name, tier, size_kb))
            print(f"  OK [{tier}] {txt_name} ({size_kb:.0f} KB)")
        else:
            failed.append((f, "empty/too_short" if text is not None else "conversion_error"))
            print(f"  FAIL: {f}")

    # ── SUMMARY ──────────────────────────────────────────────────────────
    print(f"\n{'=' * 70}")
    print(f"SUMMARY")
    print(f"{'=' * 70}")
    print(f"Total source files:  {len(all_files)}")
    print(f"Excluded:            {total_excluded}")
    print(f"Converted to TXT:    {len(converted)}")
    print(f"Failed:              {len(failed)}")
    print(f"\nBy Tier:")
    for t in ["S", "A", "B", "C", "D", "?"]:
        if tier_counts[t] > 0:
            print(f"  Tier {t}: {tier_counts[t]}")

    if failed:
        print(f"\nFailed files:")
        for fname, reason in failed:
            print(f"  - {fname} ({reason})")

    print(f"\nCorpus directory: {CORPUS_DIR}")
    print(f"Total .txt in corpus: {len(list(CORPUS_DIR.glob('*.txt')))}")

    # List converted by tier
    print(f"\n── CONVERTED FILES BY TIER ──")
    for tier_label in ["S", "A", "B", "C", "D", "?"]:
        tier_files = [(n, t, s) for n, t, s in converted if t == tier_label]
        if tier_files:
            print(f"\n  TIER {tier_label} ({len(tier_files)} files):")
            for name, _, size in sorted(tier_files):
                print(f"    {name} ({size:.0f} KB)")


if __name__ == "__main__":
    main()
