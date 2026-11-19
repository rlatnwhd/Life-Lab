from pathlib import Path
from copy import deepcopy
from zipfile import ZipFile, ZIP_DEFLATED
import struct
from lxml import etree as E

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path.home() / 'Downloads' / '프로젝트3_기획서_김수종.docx'
OUTPUT = ROOT / 'deliverables' / '프로젝트3_기획서_김수종_화면시안포함.docx'
W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
WP = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
PIC = 'http://schemas.openxmlformats.org/drawingml/2006/picture'
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
NS = {'w': W, 'r': R}

def sub(parent, name, attrs=None, text=None):
    child = E.SubElement(parent, name, attrs or {})
    if text is not None:
        child.text = text
    return child

def paragraph(text='', size=10, bold=False, color='455468', before=0, after=7, page=False, keep=False, center=False):
    p = E.Element(f'{{{W}}}p')
    pr = sub(p, f'{{{W}}}pPr')
    sub(pr, f'{{{W}}}spacing', {f'{{{W}}}before': str(before*20), f'{{{W}}}after': str(after*20), f'{{{W}}}line': '260', f'{{{W}}}lineRule':'auto'})
    if page:
        sub(pr, f'{{{W}}}pageBreakBefore')
    if keep:
        sub(pr, f'{{{W}}}keepNext')
    if center:
        sub(pr, f'{{{W}}}jc', {f'{{{W}}}val':'center'})
    r = sub(p, f'{{{W}}}r')
    rp = sub(r, f'{{{W}}}rPr')
    sub(rp, f'{{{W}}}rFonts', {f'{{{W}}}ascii':'Malgun Gothic', f'{{{W}}}hAnsi':'Malgun Gothic', f'{{{W}}}eastAsia':'맑은 고딕'})
    sub(rp, f'{{{W}}}sz', {f'{{{W}}}val':str(int(size*2))})
    sub(rp, f'{{{W}}}color', {f'{{{W}}}val':color})
    if bold:
        sub(rp, f'{{{W}}}b')
    for i,line in enumerate(text.split('\n')):
        if i:
            sub(r, f'{{{W}}}br')
        t = sub(r, f'{{{W}}}t', text=line)
        t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
    return p

with ZipFile(SOURCE) as z:
    files = {name:z.read(name) for name in z.namelist()}
doc = E.fromstring(files['word/document.xml'])
rels = E.fromstring(files['word/_rels/document.xml.rels'])
types = E.fromstring(files['[Content_Types].xml'])
body = doc.find(f'{{{W}}}body')
existing_ids = {e.get('Id') for e in rels}
image_number = 0

def picture(name, width_pt):
    global image_number
    image_number += 1
    data = (ROOT / 'deliverables' / 'screens' / name).read_bytes()
    width,height = struct.unpack('>II',data[16:24])
    cx,cy = int(width_pt*12700),int(width_pt*height/width*12700)
    rid = f'rIdLifeLabScreenshot{image_number}'
    assert rid not in existing_ids
    target = f'media/lifelab-screen-{image_number}.png'
    sub(rels,f'{{{REL}}}Relationship',{'Id':rid,'Type':R+'/image','Target':target})
    files['word/'+target]=data
    p = paragraph(after=7,center=True)
    p.remove(p.find(f'{{{W}}}r'))
    run=sub(p,f'{{{W}}}r')
    drawing=sub(run,f'{{{W}}}drawing')
    inline=sub(drawing,f'{{{WP}}}inline',{'distT':'0','distB':'0','distL':'0','distR':'0'})
    sub(inline,f'{{{WP}}}extent',{'cx':str(cx),'cy':str(cy)})
    sub(inline,f'{{{WP}}}effectExtent',{'l':'0','t':'0','r':'0','b':'0'})
    sub(inline,f'{{{WP}}}docPr',{'id':str(100+image_number),'name':name,'descr':'생활 실험실 실제 구현 화면: '+name})
    frame=sub(inline,f'{{{WP}}}cNvGraphicFramePr')
    sub(frame,f'{{{A}}}graphicFrameLocks',{'noChangeAspect':'1'})
    graphic=sub(inline,f'{{{A}}}graphic')
    gd=sub(graphic,f'{{{A}}}graphicData',{'uri':PIC})
    pic=sub(gd,f'{{{PIC}}}pic')
    nv=sub(pic,f'{{{PIC}}}nvPicPr')
    sub(nv,f'{{{PIC}}}cNvPr',{'id':str(image_number),'name':name})
    sub(nv,f'{{{PIC}}}cNvPicPr')
    blip=sub(pic,f'{{{PIC}}}blipFill')
    sub(blip,f'{{{A}}}blip',{f'{{{R}}}embed':rid})
    stretch=sub(blip,f'{{{A}}}stretch')
    sub(stretch,f'{{{A}}}fillRect')
    sp=sub(pic,f'{{{PIC}}}spPr')
    xf=sub(sp,f'{{{A}}}xfrm')
    sub(xf,f'{{{A}}}off',{'x':'0','y':'0'})
    sub(xf,f'{{{A}}}ext',{'cx':str(cx),'cy':str(cy)})
    geo=sub(sp,f'{{{A}}}prstGeom',{'prst':'rect'})
    sub(geo,f'{{{A}}}avLst')
    return p

# Update only the planning document's design-tool entry.
for row in doc.xpath('//w:tr',namespaces=NS):
    cells=row.findall(f'{{{W}}}tc')
    if cells and '사용한 AI 도구 / 프롬프트' in ''.join(cells[0].itertext()):
        cell=cells[1]
        for child in list(cell):
            if child.tag!=f'{{{W}}}tcPr': cell.remove(child)
        cell.append(paragraph('사용 도구: ChatGPT(Codex) — React 화면 구현 및 UI 시안 제작.\n디자인 참고: Ready(https://ready.so/), 굿닥(https://www.goodoc.co.kr/).\n제작 요청: “기획서의 개인 A/B 생활 실험 앱을 바탕으로 홈, 실험 생성, 일일 기록, 결과 비교 화면을 만들고, Ready와 굿닥의 느낌을 참고해 깔끔하고 모던하게 디자인해 주세요.”\n제작 결과: 실제 구현한 웹의 5개 화면(4개 핵심 화면, 실험 생성 2단계)을 아래에 삽입함.',size=9,after=0))

placeholder = next(p for p in body.findall(f'{{{W}}}p') if '(AI로 제작한 화면 스케치 이미지를 삽입하세요)' in ''.join(p.itertext()))
heading = next(p for p in body.findall(f'{{{W}}}p') if '와이어프레임 / 스케치 삽입란' in ''.join(p.itertext()))
heading_index = list(body).index(heading)
body.remove(heading)
body.insert(heading_index,paragraph('와이어프레임 / 화면 시안',size=15,bold=True,color='3478F6',after=9,page=True,keep=True))
index=list(body).index(placeholder)
body.remove(placeholder)
nodes=[
 paragraph('현재 구현한 웹의 실제 화면입니다. 흰색 바탕, 블루 버튼, 연한 보라색·파란색 A/B 조건을 적용했습니다. 화면의 실험 및 결과 수치는 기능 설명을 위한 예시 데이터입니다.',size=9,color='7C8BA1',after=12,keep=True),
 paragraph('① 홈 / 대시보드',size=12,bold=True,color='344F79',after=9,keep=True),
 picture('01-home.png',460),
 paragraph('주간 캘린더에서 날짜별 A/B 조건을 확인하고 오늘의 기록 화면으로 이동합니다. 진행 중 실험과 새 실험 만들기를 한 화면에서 제공합니다.',size=9,color='7C8BA1',after=0),
 paragraph('② 실험 생성 — 2단계 입력',size=14,bold=True,color='3478F6',after=10,page=True,keep=True),
 paragraph('1단계에서 질문·가설·A/B 조건을 정하고, 2단계에서 기간·분야·측정 항목·단위·최댓값을 설정합니다. 시작일부터 조건을 하루씩 번갈아 배정합니다.',size=9,color='7C8BA1',after=17,keep=True),
]
table=E.Element(f'{{{W}}}tbl')
pr=sub(table,f'{{{W}}}tblPr')
sub(pr,f'{{{W}}}tblW',{f'{{{W}}}w':'9360',f'{{{W}}}type':'dxa'})
sub(pr,f'{{{W}}}tblLayout',{f'{{{W}}}type':'fixed'})
borders=sub(pr,f'{{{W}}}tblBorders')
for edge in ['top','left','bottom','right','insideH','insideV']:
    sub(borders,f'{{{W}}}'+edge,{f'{{{W}}}val':'nil'})
grid=sub(table,f'{{{W}}}tblGrid')
for _ in range(2): sub(grid,f'{{{W}}}gridCol',{f'{{{W}}}w':'4680'})
row=sub(table,f'{{{W}}}tr')
for label,name,caption in [
 ('STEP 1 · 질문과 두 가지 방법','02-create-step1.png','실험 제목과 가설을 적고 비교할 두 조건을 입력합니다.'),
 ('STEP 2 · 기간과 측정 기준','03-create-step2.png','같은 기준으로 비교할 수 있도록 기간과 측정 범위를 설정합니다.')]:
    cell=sub(row,f'{{{W}}}tc')
    cp=sub(cell,f'{{{W}}}tcPr')
    sub(cp,f'{{{W}}}tcW',{f'{{{W}}}w':'4680',f'{{{W}}}type':'dxa'})
    cell.append(paragraph(label,size=10,bold=True,color='7F8FBD',after=10,center=True,keep=True))
    cell.append(picture(name,220))
    cell.append(paragraph(caption,size=9,color='7C8BA1',after=0))
nodes.extend([
 table,
 paragraph('③ 일일 기록',size=14,bold=True,color='3478F6',after=10,page=True,keep=True),
 paragraph('기록 날짜와 배정 조건을 확인한 뒤 수치·점수 및 메모를 입력합니다. 지난 날짜의 기록을 추가하거나 기존 기록을 수정할 수 있습니다.',size=9,color='7C8BA1',after=16,keep=True),
 picture('04-daily-record.png',320),
 paragraph('측정 단위와 허용 범위를 표시하고 숫자 입력과 슬라이더를 제공합니다. 저장한 값은 해당 실험의 평균과 추세에 반영됩니다.',size=9,color='7C8BA1',after=0),
 paragraph('④ 결과 비교',size=14,bold=True,color='3478F6',after=10,page=True,keep=True),
 paragraph('조건별 평균·기록 횟수·차이와 추세 그래프, 일별 기록 표를 함께 제공합니다. 개인 실험 결과만으로 원인을 확정할 수 없다는 해석 안내를 표시합니다.',size=9,color='7C8BA1',after=15,keep=True),
 picture('05-results.png',460),
 paragraph('현재 시안은 브라우저 내부 저장(localStorage)으로 동작합니다. 로그인·Supabase 연동 및 공개 배포는 후속 개발 항목입니다.',size=9,color='7C8BA1',after=0),
 paragraph(page=True,after=0)
])
for node in nodes:
    body.insert(index,node)
    index+=1
if not any(e.get('Extension')=='png' for e in types):
    sub(types,f'{{{CT}}}Default',{'Extension':'png','ContentType':'image/png'})
for name,root in [('word/document.xml',doc),('word/_rels/document.xml.rels',rels),('[Content_Types].xml',types)]:
    files[name]=E.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(OUTPUT,'w',ZIP_DEFLATED) as z:
    for name,data in files.items():z.writestr(name,data)

with ZipFile(OUTPUT) as z:
    assert z.testzip() is None
    document=E.fromstring(z.read('word/document.xml'))
    assert len(document.findall('.//{%s}drawing'%W))==5
    assert '실제 시안 제작 및 삽입은 아직 완료되지 않음' not in ''.join(document.itertext())
    for name in ['word/document.xml','word/_rels/document.xml.rels','[Content_Types].xml']:
        E.fromstring(z.read(name))
print(str(OUTPUT).encode('ascii','backslashreplace').decode())
print('Validated: 5 embedded PNG images, 4 screen sections, image relationships, OOXML package integrity.')
