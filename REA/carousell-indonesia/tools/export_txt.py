"""Export all human-readable findings as plain text with explicit table labels."""
from pathlib import Path
import re
import json

ROOT=Path(__file__).resolve().parents[1]

def inline(text):
    text=re.sub(r'!\[([^\]]*)\]\(([^)]+)\)',r'[Screenshot: \1; file: \2]',text)
    text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'\1 (\2)',text)
    return text.replace('**','').replace('`','')

def convert(text):
    lines=text.splitlines(); out=[];i=0;in_code=False
    while i<len(lines):
        line=lines[i]
        if line.strip().startswith('```'):
            in_code=not in_code;i+=1;continue
        if not in_code and line.strip().startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[inline(s.strip()) for s in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+',s) for s in row): rows.append(row)
                i+=1
            if rows:
                for row in rows[1:]:
                    out.append('')
                    for label,value in zip(rows[0],row):out.append(label+': '+value)
                out.append('')
            continue
        if not in_code and re.match(r'^#{1,6} ',line):
            title=re.sub(r'^#{1,6} ','',inline(line))
            out.extend(['',title,'='*min(90,len(title)),''])
        else:out.append(line if in_code else inline(line))
        i+=1
    return '\n'.join(out)

parts=['CAROUSELL INDONESIA - COMPLETE PLAIN-TEXT COLLABORATOR REFERENCE',
       'Research date: 7 November 2026, Asia/Jakarta.',
       'This text contains the complete human-readable report, official source ledger,',
       'collaborator procedures, screenshot index and every extracted endpoint candidate.',
       'Screenshots remain image files; the PDF embeds them. Raw machine analysis is',
       'preserved in evidence/rea-evidence-bundle.json.gz, rather than expanded here.',
       'Observed facts, static candidates, documentation, proposals and unknowns must',
       'retain their distinct evidence labels when used by a person or an AI.','']
repo_readme=ROOT.parents[1]/'README.md'
for label,p in [('REPOSITORY CONTEXT',repo_readme),('COMPLETE DESIGN DOCUMENT',ROOT/'CAROUSELL-DESIGN-DOCUMENT.md'),('OFFICIAL APP AND HELP SOURCE LEDGER',ROOT/'app-research.md'),('COLLABORATOR HANDOFF AND REPRODUCTION',ROOT/'HANDOFF.md')]:
    parts.extend(['\n'+'='*90,label,'='*90,convert(p.read_text(encoding='utf8'))])
parts.extend(['\n'+'='*90,'COMPLETE SCREENSHOT INDEX','='*90])
parts.extend('screenshots/'+p.name for p in sorted((ROOT/'screenshots').glob('*.jpg')))
parts.extend(['\n'+'='*90,'COMPLETE STATIC ENDPOINT-REGISTRATION INVENTORY','='*90,
              'Static syntax candidates only. Not live API verification or Indonesia entitlement.',
              'Offsets are zero-based decoded JavaScript string offsets.'])
for i,e in enumerate(json.loads((ROOT/'evidence/endpoint-candidates.json').read_text()),1):
    parts.extend(['',str(i)+'. '+e['methodExpression']+' '+e['path'],'Source file: web-assets/'+e['file'],'Offset: '+str(e['offset']),'Registration: '+e['source']])
out=ROOT/'CAROUSELL-DESIGN-DOCUMENT.txt'
out.write_text('\n'.join(parts)+'\n',encoding='utf8')
print(out)
