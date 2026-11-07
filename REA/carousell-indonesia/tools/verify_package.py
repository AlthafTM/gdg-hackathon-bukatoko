"""Verify committed handoff bytes, PDF contents, and streaming export identity."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--write-manifest',action='store_true')
args=parser.parse_args()

def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for b in iter(lambda:f.read(1048576),b''): h.update(b)
    return h.hexdigest()

def files():
    excluded={'package-manifest.json','pdf-validation.json'}
    return sorted(p for p in ROOT.rglob('*') if p.is_file() and p.name not in excluded and not any(x in p.relative_to(ROOT).parts for x in ('.venv','review','__pycache__')))

if args.write_manifest:
    manifest=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in files()]
    (ROOT/'package-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
manifest=json.loads((ROOT/'package-manifest.json').read_text())
errors=[]
for entry in manifest:
    p=ROOT/entry['path']
    if not p.is_file() or p.stat().st_size!=entry['bytes'] or digest(p)!=entry['sha256']:errors.append(entry['path'])
expected={e['path'] for e in manifest}
unlisted=[p.relative_to(ROOT).as_posix() for p in files() if p.relative_to(ROOT).as_posix() not in expected]
assets=json.loads((ROOT/'evidence/asset-manifest.json').read_text())
for a in assets:
    if digest(ROOT/'web-assets'/a['file'])!=a['sha256']:errors.append('asset identity: '+a['file'])
identity=json.loads((ROOT/'evidence/rea-export-identity.json').read_text())
h=hashlib.sha256();size=0
with gzip.open(ROOT/'evidence/rea-evidence-bundle.json.gz','rb') as f:
    for b in iter(lambda:f.read(1048576),b''): h.update(b);size+=len(b)
if size!=identity['uncompressedBytes'] or h.hexdigest()!=identity['uncompressedSha256']:errors.append('expanded REA identity')
reader=PdfReader(ROOT/'CAROUSELL-DESIGN-DOCUMENT.pdf')
pages=[p.extract_text() or '' for p in reader.pages]
text='\n'.join(pages)
required=['Residual unknown register','Collaborator handoff and reproduction steps','Static endpoint-registration inventory','Android','233,639,453','/chat/1.0/header','U12']
missing=[s for s in required if s not in text]
plain=(ROOT/'CAROUSELL-DESIGN-DOCUMENT.txt').read_text(encoding='utf8')
plain_required=['GDGoC ITB Stack Hackathon','Request an item','COMPLETE DESIGN DOCUMENT','OFFICIAL APP AND HELP SOURCE LEDGER','COLLABORATOR HANDOFF AND REPRODUCTION','326.','/chat/1.0/header','U12']
missing_plain=[s for s in plain_required if s not in plain]
result={'pageCount':len(pages),'pdfBytes':(ROOT/'CAROUSELL-DESIGN-DOCUMENT.pdf').stat().st_size,'plainTextBytes':(ROOT/'CAROUSELL-DESIGN-DOCUMENT.txt').stat().st_size,'manifestFiles':len(manifest),'assetCount':len(assets),'endpointOccurrences':len(json.loads((ROOT/'evidence/endpoint-candidates.json').read_text())),'screenshotCount':len(list((ROOT/'screenshots').glob('*.jpg'))),'expandedReaBytes':size,'expandedReaSha256':h.hexdigest(),'integrityErrors':errors,'unlistedFiles':unlisted,'missingPdfContent':missing,'missingPlainTextContent':missing_plain,'emptyPages':[i+1 for i,t in enumerate(pages) if len(t.strip())<100],'automatedPass':not errors and not missing and not missing_plain and not unlisted,'visualReview':'See visual-review.md for the authored PDF review. Render and review again after rebuilding; automated parsing does not establish visual quality.'}
(ROOT/'pdf-validation.json').write_text(json.dumps(result,indent=2),encoding='utf8')
print(json.dumps(result,indent=2))
raise SystemExit(0 if result['automatedPass'] else 1)
