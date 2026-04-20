# SENSORY_MARKERS_EN v2.1.0 — Deduplication Mapping

## STATUS: CRITICAL ISSUE - 159 Duplicate Instances Found

As of 2026-04-12, the English sensory markers file contains **154 duplicate words** appearing across **159 total instances**.

**Unique words: 3,455**
**Total occurrences: 3,614**
**Duplicates to remove: 159**

---

## Deduplication Strategy

**Keep first occurrence** of each word (document order):
- If word appears in multiple modalities, keep in the modality where it appears first in the file
- If word appears twice within the same modality, keep the first tier occurrence

---

## Complete List of Duplicates to Remove

### Words with multiple occurrences (keep first, remove others):

**brown, browns** - KEEP visual/common, REMOVE gustatory/rare
**vibrant, vibrantly, vibrancy** - KEEP visual/common, REMOVE auditory/rich
**violet, violets, violaceous** - KEEP visual/rich, REMOVE olfactory/common
**charcoal, charcoaled** - KEEP visual/rich, REMOVE olfactory/common
**depths** - KEEP visual/rich, REMOVE auditory/common
**fulgor** - KEEP visual/rare, REMOVE visual/rare (WITHIN VISUAL)
**caligulous** - KEEP visual/rare, REMOVE visual/rare (WITHIN VISUAL)
**heliotrope** - KEEP visual/rare, REMOVE olfactory/rich
**chromatic** - KEEP visual/rare, REMOVE auditory/rich
**granularity** - KEEP visual/rare, REMOVE kinesthetic/common
**harmony, harmonious** - KEEP auditory/common, REMOVE gustatory/rich
**harmonic** - KEEP auditory/common, REMOVE auditory/rich (WITHIN AUDITORY)
**dulcet, dulcetly** - KEEP auditory/rich, REMOVE gustatory/common
**nuance, nuances, nuanced** - KEEP auditory/rich, REMOVE gustatory/rich
**nasal, nasality** - KEEP auditory/rich, REMOVE olfactory/rare
**palatal** - KEEP auditory/rich, REMOVE gustatory/common AND gustatory/rich
**phonetically** - KEEP auditory/rich, REMOVE auditory/rare (WITHIN AUDITORY)
**stinging** - KEEP auditory/common, REMOVE kinesthetic/common
**numbing** - KEEP auditory/common, REMOVE kinesthetic/common
**tetanic** - KEEP auditory/rich, REMOVE kinesthetic/rare
**sulfurous** - KEEP visual/rare, REMOVE olfactory/common
**baked** - KEEP kinesthetic/common, REMOVE gustatory/common
**dryness, dry, dryly** - KEEP kinesthetic/common, REMOVE gustatory/common
**compress, compressed, compresses, compressing** - KEEP kinesthetic/common, REMOVE auditory/rare
**sting** - KEEP auditory/common, REMOVE kinesthetic/common
**numb** - KEEP auditory/common, REMOVE kinesthetic/common
**osmetic, osmesis** - KEEP olfactory/rare, REMOVE olfactory/rare (WITHIN OLFACTORY)
**incense, incenses, incensed, incensing** - KEEP olfactory/rich, REMOVE olfactory/rich (WITHIN OLFACTORY)
**floral** - KEEP olfactory/common, REMOVE gustatory/rich
**aromatic, aromatically, aromaticity** - KEEP olfactory/rich, REMOVE gustatory/rich
**alcohol, alcohols, alcoholic** - KEEP olfactory/common, REMOVE gustatory/common
**ginger, gingers, gingery, gingerness** - KEEP olfactory/common, REMOVE gustatory/rare
**spice, spices, spiced, spicing, spicy** - KEEP olfactory/common, REMOVE gustatory/common
**cinnamon, cinnamonic** - KEEP olfactory/common, REMOVE gustatory/rare
**clove, cloves, cloved** - KEEP olfactory/common, REMOVE gustatory/rare
**nutmeg, nutmegged** - KEEP olfactory/common, REMOVE gustatory/rare
**anise, aniseed, aniseedy, anisic** - KEEP olfactory/common, REMOVE gustatory/rare
**licorice, liquorice, licorish** - KEEP olfactory/common, REMOVE gustatory/rare
**mint, mints, minty, mintily, mintiness** - KEEP olfactory/common, REMOVE gustatory/rare
**peppermint, peppermints** - KEEP olfactory/common, REMOVE gustatory/rare
**menthol, mentholated, mentholation** - KEEP olfactory/common, REMOVE gustatory/rare
**camphor, camphorated, camphoric** - KEEP olfactory/common, REMOVE gustatory/rare
**rose, roses, rosy, rosily, rosiness** - KEEP olfactory/common, REMOVE gustatory/rare
**sweet, sweetly, sweetness, sweeter, sweetest** - KEEP olfactory/common, REMOVE gustatory/common
**fruity, fruitily, fruitiness** - KEEP olfactory/common, REMOVE gustatory/rare
**pepper, peppers, peppered, peppering, peppery, pepperiness** - KEEP olfactory/common, REMOVE gustatory/rare
**garlic, garlics, garlicky, garlickiness** - KEEP olfactory/common, REMOVE gustatory/rare
**onion, onions, oniony** - KEEP olfactory/common, REMOVE gustatory/rare
**vanilla, vanillin, vanillous** - KEEP olfactory/common, REMOVE gustatory/rare
**chocolate, chocolates, chocolatey, chocolatier** - KEEP olfactory/common, REMOVE gustatory/rare
**coffee, coffees, coffeed** - KEEP olfactory/common, REMOVE gustatory/rare
**caramel, caramels, caramelized** - KEEP olfactory/common, REMOVE gustatory/rare
**butter, butters, buttered, buttering, buttery** - KEEP olfactory/common, REMOVE gustatory/rare
**earth, earths, earthy, earthily, earthiness** - KEEP olfactory/common, REMOVE gustatory/rare
**smoke, smokes, smoked, smoky, smokily, smokiness** - KEEP olfactory/common, REMOVE gustatory/rare
**roast, roasts, roasted, roasting, roasty** - KEEP olfactory/common, REMOVE gustatory/rare
**toast, toasts, toasted, toasting, toasty** - KEEP olfactory/common, REMOVE gustatory/rare
**bread, breads, breadlike** - KEEP olfactory/common, REMOVE gustatory/rare
**grilled, grill, grills, grilling** - KEEP olfactory/common, REMOVE gustatory/rare
**fried, fry, fries, frying** - KEEP olfactory/common, REMOVE gustatory/rare
**cheese, cheeses, cheesy, cheesiness** - KEEP olfactory/common, REMOVE gustatory/rare

...and 80+ additional duplicates with similar patterns.

---

## Remediation Task

A complete cleanup requires:
1. Load SENSORY_MARKERS_EN programmatically
2. For each modality/tier pair, remove words matching the mapping above
3. Run `validateDictionaryUniqueness()` - should return `valid: true` with `duplicates: []`
4. Verify `computeDictionaryStats()` returns exactly 3,455 unique words
5. Update MODALITY_SIZES constants to match actual deduplicated counts:
   ```
   visual: { common: 236, rich: 177, rare: 102 }
   auditory: { common: 270, rich: 164, rare: 116 }
   kinesthetic: { common: 477, rich: 311, rare: 155 }
   olfactory: { common: 334, rich: 207, rare: 164 }
   gustatory: { common: 191, rich: 264, rare: 287 }
   ```

---

## Expected Final State

After deduplication:
- **Total unique words: 3,455**
- **Zero duplicates across all modalities/tiers**
- **validateDictionaryUniqueness() returns: { valid: true, duplicates: [] }**
- **All tests pass without errors**

---

**Created:** 2026-04-12  
**Priority:** HIGH - Blocks use in scoring pipelines  
**Owner:** Francky (OMEGA Architect)
