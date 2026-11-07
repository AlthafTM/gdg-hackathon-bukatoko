"""Build the offline research PDF from the committed report and evidence."""
from pathlib import Path
import re
import json
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, Image, PageBreak, KeepTogether, Flowable)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'CAROUSELL-DESIGN-DOCUMENT.pdf'
PAGE_W, PAGE_H = 595.28, 841.89
MARGIN = 43
WIDTH = PAGE_W - MARGIN * 2
FONT, BOLD, MONO = 'Helvetica', 'Helvetica-Bold', 'Courier'
for regular, bold, mono in [
    ('C:/Windows/Fonts/arial.ttf','C:/Windows/Fonts/arialbd.ttf','C:/Windows/Fonts/consola.ttf'),
    ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'),
    ('/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf','/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf','/usr/share/fonts/truetype/liberation2/LiberationMono-Regular.ttf')]:
    if all(Path(p).is_file() for p in (regular,bold,mono)):
        for name,p in [('Body',regular),('Strong',bold),('Mono',mono)]:
            pdfmetrics.registerFont(TTFont(name,p))
        FONT,BOLD,MONO='Body','Strong','Mono'
        pdfmetrics.registerFontFamily(FONT,normal=FONT,bold=BOLD,italic=FONT,boldItalic=BOLD)
        break

def clean(text):
    return text.translate(str.maketrans({'\u2011':'-','\u2013':'-','\u2014':'-', '\u2192':' -> ', '\u00d7':' x ', '\u2265':'>=', '\u202f':' '}))

def rich(text):
    text=escape(clean(text))
    text=re.sub(r'`([^`]+)`',lambda m:f'<font name="{MONO}">{m.group(1)}</font>',text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    def link(m):
        label,url=m.group(1),m.group(2)
        return f'<link href="{url}" color="#126257">{label}</link>' if url.startswith('http') else label
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,text)

styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='Text',fontName=FONT,fontSize=9.2,leading=13.5,spaceAfter=7,textColor=colors.HexColor('#263438')))
styles.add(ParagraphStyle(name='TitleReport',fontName=BOLD,fontSize=29,leading=34,spaceAfter=16,textColor=colors.HexColor('#163e3b')))
styles.add(ParagraphStyle(name='H1r',fontName=BOLD,fontSize=19,leading=24,spaceBefore=8,spaceAfter=12,keepWithNext=True,textColor=colors.HexColor('#163e3b')))
styles.add(ParagraphStyle(name='H2r',fontName=BOLD,fontSize=15,leading=19,spaceBefore=15,spaceAfter=9,keepWithNext=True,textColor=colors.HexColor('#163e3b')))
styles.add(ParagraphStyle(name='H3r',fontName=BOLD,fontSize=11.3,leading=15,spaceBefore=10,spaceAfter=6,keepWithNext=True))
styles.add(ParagraphStyle(name='Cell',fontName=FONT,fontSize=7.4,leading=10.2,spaceAfter=0,splitLongWords=True))
styles.add(ParagraphStyle(name='CellHead',parent=styles['Cell'],fontName=BOLD,textColor=colors.white))
styles.add(ParagraphStyle(name='CodeBlock',fontName=MONO,fontSize=7.4,leading=10,spaceAfter=3,splitLongWords=True))
styles.add(ParagraphStyle(name='Caption',fontName=FONT,fontSize=8,leading=11,textColor=colors.HexColor('#58706d'),spaceBefore=5,spaceAfter=13))

class ResearchDoc(BaseDocTemplate):
    def afterFlowable(self, f):
        if isinstance(f,Paragraph) and f.style.name in ('H1r','H2r'):
            level=0 if f.style.name=='H1r' else 1
            key='heading-'+str(self.seq.nextf('heading'))
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(f.getPlainText(),key,level,False)
            self.notify('TOCEntry',(level,f.getPlainText(),self.page,key))

def page_chrome(c,doc):
    c.saveState()
    c.setStrokeColor(colors.HexColor('#c9d8d5'))
    c.line(MARGIN,PAGE_H-31,PAGE_W-MARGIN,PAGE_H-31)
    c.setFont(FONT,7)
    c.setFillColor(colors.HexColor('#58706d'))
    c.drawString(MARGIN,PAGE_H-24,'CAROUSELL INDONESIA / REVERSE ENGINEERING')
    c.drawString(MARGIN,24,'7 November 2026 | Public web evidence and proposed reconstruction')
    c.drawRightString(PAGE_W-MARGIN,24,str(doc.page))
    c.restoreState()

story=[]
used_images=set()
def para(t,style='Text'): return Paragraph(rich(t),styles[style])
def add_image(src,caption,heading=None):
    p=ROOT/src
    if not p.is_file(): raise FileNotFoundError(p)
    iw,ih=ImageReader(str(p)).getSize()
    scale=min(WIDTH/iw,510/ih)
    parts=[para(heading,'H3r')] if heading else []
    parts.extend([Image(str(p),width=iw*scale,height=ih*scale),para(caption,'Caption')])
    story.append(KeepTogether(parts))
    used_images.add(p.name)

def table(rows,header=True):
    n=len(rows[0])
    # Favor explanatory columns while retaining legible label columns.
    weights={2:[.28,.72],3:[.22,.37,.41],4:[.16,.29,.28,.27]}.get(n,[1/n]*n)
    widths=[WIDTH*w for w in weights]
    data=[[para(c,'CellHead' if i==0 and header else 'Cell') for c in row] for i,row in enumerate(rows)]
    t=Table(data,colWidths=widths,repeatRows=1 if header else 0,hAlign='LEFT')
    commands=[('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#d7e0de'))]
    if header: commands.extend([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#20534e')),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f2f6f5')])])
    t.setStyle(TableStyle(commands))
    story.extend([t,Spacer(1,10)])

def diagram(content):
    if 'Home[Home or category]' in content:
        nodes=['Home/category and filtered search','Inspect listing and seller','Chat -> guest login dialog (observed)','Listing-specific conversation (documented)','Agree price, payment and delivery','Offer -> seller acceptance','Mutual review eligibility']
    else:
        nodes=['Responsive web / future verified native parity','Edge + identity and authorization','Catalog/media | Discovery/search | Trade | Trust','Object storage | Search index | Transactional storage','Durable notifications and policy jobs']
    rows=[]
    for i,node in enumerate(nodes):
        rows.append([para(node,'Cell')])
        if i<len(nodes)-1: rows.append([para('v','Cell')])
    t=Table(rows,colWidths=[WIDTH-30])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#edf4f1')),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#a9c1ba')),('LEFTPADDING',(0,0),(-1,-1),15),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    story.extend([KeepTogether([t,para('Flow rendered from the Markdown diagram. Evidence labels and proposal boundaries follow the surrounding text.','Caption')])])

def markdown(text):
    lines=text.splitlines(); i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line: i+=1;continue
        if line.startswith('```'):
            lang=line[3:];i+=1;block=[]
            while i<len(lines) and not lines[i].strip().startswith('```'):block.append(lines[i]);i+=1
            if lang=='mermaid':diagram('\n'.join(block))
            else:
                for b in block:story.append(para(b or ' ','CodeBlock'))
                story.append(Spacer(1,8))
            i+=1;continue
        if line.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[:\- ]+',c) for c in row):rows.append(row)
                i+=1
            table(rows);continue
        img=re.fullmatch(r'!\[([^\]]*)\]\(([^)]+)\)',line)
        if img:add_image(img[2],img[1]);i+=1;continue
        if line.startswith('# '):story.append(para(line[2:],'H1r'));i+=1;continue
        if line.startswith('## '):story.append(para(line[3:],'H2r'));i+=1;continue
        if line.startswith('### '):story.append(para(line[4:],'H3r'));i+=1;continue
        if re.match(r'^(- |\d+\. )',line):story.append(para(line));i+=1;continue
        block=[line];i+=1
        while i<len(lines) and lines[i].strip() and not re.match(r'^(#|\||```|!\[|- |\d+\. )',lines[i].strip()):
            block.append(lines[i].strip());i+=1
        story.append(para(' '.join(block)))

story.extend([Spacer(1,75),para('Carousell Indonesia','TitleReport'),para('Reverse-engineering findings and reconstruction design','H1r'),Spacer(1,18),para('Complete collaborator edition | 7 November 2026'),para('Live public web observations, 43 shipped JavaScript bundles, official app evidence, an implementation specification and reproducible handoff.'),Spacer(1,20),para('Coverage boundary','H3r'),para('Native binaries and authenticated transactions were not inspected. Proposed schemas, APIs and architecture are explicitly separated from recovered facts. The full raw REA export accompanies this PDF as compressed repository evidence.'),PageBreak()])
story.append(para('Contents','TitleReport'))
toc=TableOfContents();toc.levelStyles=[ParagraphStyle(name='TOC0',fontName=BOLD,fontSize=9.8,leading=14,spaceBefore=8,leftIndent=0,firstLineIndent=0),ParagraphStyle(name='TOC1',fontName=FONT,fontSize=8.5,leading=12,leftIndent=12,firstLineIndent=0,spaceBefore=3)]
story.extend([toc,PageBreak()])
markdown((ROOT/'CAROUSELL-DESIGN-DOCUMENT.md').read_text(encoding='utf8'))
story.append(PageBreak());markdown((ROOT/'app-research.md').read_text(encoding='utf8'))
story.append(PageBreak());markdown((ROOT/'HANDOFF.md').read_text(encoding='utf8'))
story.extend([PageBreak(),para('Additional screenshot evidence','H1r')])
for p in sorted((ROOT/'screenshots').glob('*.jpg')):
    if p.name not in used_images:
        add_image('screenshots/'+p.name,'Observed guest web surface. System dark theme; viewport and scope are documented in the report.',p.stem.replace('-',' '))
story.extend([PageBreak(),para('Static endpoint-registration inventory','H1r'),para('All 326 syntactically matched occurrences from the acquired bundles follow. These are static candidates, not validated deployed APIs or Indonesian feature entitlements. Original registration contexts and exact identities are in the accompanying JSON files. Offsets are zero-based decoded JavaScript string offsets, not raw byte offsets.')])
endpoints=json.loads((ROOT/'evidence/endpoint-candidates.json').read_text())
table([['Method expression','Path','Source offset']]+[[e['methodExpression'],e['path'],e['file']+' : '+str(e['offset'])] for e in endpoints])
doc=ResearchDoc(str(OUT),pagesize=(PAGE_W,PAGE_H),leftMargin=MARGIN,rightMargin=MARGIN,topMargin=48,bottomMargin=43,title='Carousell Indonesia - Reverse Engineering and Reconstruction Design',author='GDG Hackathon Bukatoko collaborators')
doc.addPageTemplates(PageTemplate(id='Research',frames=[Frame(MARGIN,43,WIDTH,PAGE_H-91,id='body',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)],onPage=page_chrome))
doc.multiBuild(story)
print(OUT)
