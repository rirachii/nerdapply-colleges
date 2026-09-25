"""Verify printable artifacts produced by npm run pdf:sample. Requires pypdf/pdfplumber."""
from pathlib import Path
from pypdf import PdfReader
import pdfplumber
import sys
import re

cases=[(Path('output/pdf/john-smith-college-guide.pdf'),7,10), (Path('output/pdf/marine-biology-college-guide.pdf'),5,6)]
if '--stress' in sys.argv:
    cases += [(Path('tmp/pdfs/stress-long.pdf'),13,20), (Path('tmp/pdfs/stress-unbroken.pdf'),13,20)]
for path,expected_pages,expected_schools in cases:
    reader=PdfReader(path)
    assert len(reader.pages)==expected_pages, f'{path}: unexpected pagination: {len(reader.pages)}'
    all_text='\n'.join(p.extract_text() or '' for p in reader.pages)
    assert 'Congressional App Challenge' not in all_text, 'Raw counselor notes leaked'
    assert 'Quiet kid' not in all_text, 'Raw counselor notes leaked'
    assert 'Your shortlist at a glance' in all_text and 'Understanding your list' in all_text
    if path.parent == Path('output/pdf'):
        assert 'Let’s choose two colleges' in all_text
    assert len(re.findall(r'COLLEGE \d{2}',all_text))==expected_schools, f'Missing college details in {path}'
    links=[]
    for i,page in enumerate(reader.pages):
        assert tuple(float(v) for v in page.mediabox[2:])==(612.0,792.0)
        assert len(page.images)>=1, f'Missing header logo on {path} page {i+1}'
        text=page.extract_text() or ''
        assert len(text)>250, f'Sparse/blank page {i+1}'
        assert f'{i+1} / {len(reader.pages)}' in text, f'Missing page number on page {i+1}'
        for ref in page.get('/Annots',[]):
            action=ref.get_object().get('/A',{})
            if action.get('/URI'): links.append(str(action['/URI']))
    assert any('collegescorecard.ed.gov/school/' in url for url in links)
    with pdfplumber.open(path) as pdf:
        for i,page in enumerate(pdf.pages):
            for word in page.extract_words():
                assert word['x0']>=36 and word['x1']<=576, f'Horizontal clipping {path} page {i+1}: {word}'
                assert word['top']>=20 and word['bottom']<=775, f'Vertical clipping {path} page {i+1}: {word}'
    print(f'PASS {path}: {len(reader.pages)} US Letter pages, {expected_schools} school details, header logos, footers, notes privacy, hyperlinks, and text boundaries')
