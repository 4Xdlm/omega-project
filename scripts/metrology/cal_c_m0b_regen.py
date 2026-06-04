#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CAL-C — M0b régénération Ridge REPRODUCTIBLE (nouveau calibration_id + SHA).
Tribunal 2/2 : INTERDIT de re-sceller le SHA disque à l'aveugle. On régénère sur données
DISPONIBLES (R2_FEATURE_MATRIX 568, 5 features M0b, target=tier, dispatch FR/EN), seed fixe,
=> ρ frais reproductible + SHA neuf. NE reproduit PAS ρ=0.6138 (corpus 568≠1334). Honnête.
Limite : author-split S-1 indisponible (champ author dégénéré sur R2, cf V4-A0) => holdout random seed=42.
"""
import json, csv, os, hashlib, random
import numpy as np
random.seed(42); np.random.seed(42)

R2=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\corpus-analysis\R2_FEATURE_MATRIX.csv"
OUT=r"C:\Users\elric\Claude-Workspace\OMEGA\outputs\metrology\M0B_R2_REGEN_v1.json"
FEATS=["tf_f24c_contrast_delta","tf_f33b_commas_count","tf_f1a_rhythm_variance","tf_f33c_dot_comma_ratio","tf_f12_tense_switches"]

def spearman(x,y):
    n=len(x)
    def rank(v):
        o=sorted(range(n),key=lambda i:v[i]); r=[0.0]*n; i=0
        while i<n:
            j=i
            while j+1<n and v[o[j+1]]==v[o[i]]: j+=1
            for k in range(i,j+1): r[o[k]]=(i+j)/2.0+1
            i=j+1
        return r
    rx,ry=rank(x),rank(y); mx=sum(rx)/n; my=sum(ry)/n
    num=sum((a-mx)*(b-my) for a,b in zip(rx,ry))
    den=(sum((a-mx)**2 for a in rx)*sum((b-my)**2 for b in ry))**0.5
    return num/den if den else float("nan")

def ridge_fit(X,y,alpha=1.0):
    # standardize
    mu=X.mean(0); sd=X.std(0); sd[sd==0]=1; Xs=(X-mu)/sd
    Xb=np.hstack([np.ones((Xs.shape[0],1)),Xs])
    d=Xb.shape[1]; R=alpha*np.eye(d); R[0,0]=0
    w=np.linalg.solve(Xb.T@Xb+R, Xb.T@y)
    return w,mu,sd
def ridge_pred(X,w,mu,sd):
    Xs=(X-mu)/sd; Xb=np.hstack([np.ones((Xs.shape[0],1)),Xs]); return Xb@w

def main():
    rows=[r for r in csv.DictReader(open(R2,encoding="utf-8"))]
    def good(r):
        try:
            [float(r[f]) for f in FEATS]; int(r["tier"]); return True
        except Exception: return False
    rows=[r for r in rows if good(r)]
    def block(lang_filter):
        sub=[r for r in rows if (lang_filter is None or r.get("lang")==lang_filter)]
        if len(sub)<40: return None
        X=np.array([[float(r[f]) for f in FEATS] for r in sub]); y=np.array([float(r["tier"]) for r in sub])
        idx=list(range(len(sub))); random.Random(42).shuffle(idx)
        cut=int(len(idx)*0.8); tr=idx[:cut]; ho=idx[cut:]
        w,mu,sd=ridge_fit(X[tr],y[tr])
        pred=ridge_pred(X[ho],w,mu,sd)
        rho=spearman(list(pred),list(y[ho]))
        # 5-fold CV spearman
        folds=5; cvr=[]
        for k in range(folds):
            te=[i for n,i in enumerate(idx) if n%folds==k]; trr=[i for i in idx if i not in te]
            if len(te)<5: continue
            w2,m2,s2=ridge_fit(X[trr],y[trr]); p2=ridge_pred(X[te],w2,m2,s2)
            cvr.append(spearman(list(p2),list(y[te])))
        return dict(n=len(sub),n_train=len(tr),n_holdout=len(ho),
                    rho_holdout=round(float(rho),4),
                    cv5_mean=round(float(np.mean(cvr)),4) if cvr else None,
                    cv5_std=round(float(np.std(cvr)),4) if cvr else None,
                    coef=[round(float(x),5) for x in w])
    res={"calibration_id":"M0b_R2_regen_v1_2026-06-04","model":"ridge_alpha1.0","features":FEATS,
         "source":"R2_FEATURE_MATRIX.csv (568)","target":"tier","seed":42,
         "caveat":"NE reproduit PAS rho=0.6138 (corpus 568 != 1334 V3.4). author-split S-1 indisponible (champ author degenere R2) => holdout random. Calibration FRAICHE reproductible, pas la V3.4 historique.",
         "blocks":{}}
    for lab,lf in [("ALL",None),("FR","fr"),("EN","en")]:
        b=block(lf)
        if b: res["blocks"][lab]=b
    payload=json.dumps(res,ensure_ascii=False,sort_keys=True).encode()
    res["self_sha256"]=hashlib.sha256(payload).hexdigest()
    json.dump(res,open(OUT,"w",encoding="utf-8"),ensure_ascii=False,indent=2)
    print(json.dumps({k:v for k,v in res.items() if k!="blocks"},ensure_ascii=False,indent=2))
    for lab,b in res["blocks"].items(): print(lab,"rho_holdout",b["rho_holdout"],"cv5",b["cv5_mean"])

if __name__=="__main__": main()
