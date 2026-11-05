"""Render static previews from popup.html. Requires beautifulsoup4, weasyprint, PyMuPDF.
These are interface illustrations; they do not claim a live diagnostic result.
"""
import json,re,html
from pathlib import Path
from bs4 import BeautifulSoup
from weasyprint import HTML
import fitz
root=Path(__file__).resolve().parent.parent
import subprocess
# Use the same dictionaries as the extension. No separate translation copy.
script="const fs=require('fs'),vm=require('vm');const c={localStorage:{getItem:()=>null},chrome:{i18n:{getUILanguage:()=> 'en-US'}},navigator:{language:'en-US'},document:{documentElement:{},querySelectorAll:()=>[]}};vm.runInNewContext(fs.readFileSync('i18n.js','utf8')+';this.copy=UI_TEXT;',c);process.stdout.write(JSON.stringify(c.copy));"
texts=json.loads(subprocess.check_output(['node','-e',script],cwd=root))
for mode,lang in [('simple','en'),('advanced','en'),('arabic','ar'),('persian','fa')]:
 soup=BeautifulSoup((root/'popup.html').read_text(),'html.parser');d=texts[lang]
 soup.html['dir']='rtl' if lang in ['ar','fa'] else 'ltr'
 for n in soup.select('[data-i18n]'): n.string=d[n['data-i18n']]
 for n in soup.select('script'):n.decompose()
 for n in soup.select('select'):
  v={'uiLanguage':{'en':'English','ar':'العربية','fa':'فارسی'}[lang],'mode':d['advanced' if mode=='advanced' else 'simple'],'preset':'English (United States) · New York','simpleLanguage':'English (United States) · en-US'}.get(n.get('id'),'')
  n.name='div';n['class']=['form-preview'];n.clear();n.string=v+'  ▾'
 for n in soup.select('input'):
  if n.get('type')=='checkbox':n.name='span';n.string='☐';n.attrs={'style':'width:auto;display:inline-block'};continue
  vals={'locale':'en-US','languages':'en-US, en','timezone':'America/New_York','latitude':'0','longitude':'0'}
  val=vals.get(n.get('id'),n.get('placeholder',''))
  n.name='div';n['class']=['form-preview'];n.clear();n.string=val or ' '
 soup.select_one('#powerLabel').string=d['enableAction'];soup.select_one('#stateText').string=d['off']
 soup.select_one('#profileSummary').string='en-US · America/New_York'
 if mode=='advanced':
  soup.select_one('#advancedSettings').attrs.pop('hidden',None)
  for n in soup.select('#advancedSettings details'):
   if n.get('id') not in ['section-language','section-timezone']:n.decompose()
  for ident in ['quickLanguages','languageResults','zoneResults','languageOrder','languageSearch','zoneSearch','englishFallback','languageCount','zoneCount']:
   n=soup.select_one('#'+ident)
   if n:n.decompose()
  for n in soup.select('#advancedSettings .note'):n.decompose()
  soup.select_one('#diagnose').decompose()
 for n in soup.select('.diagnostics'):n.decompose()
 extra=soup.new_tag('style');extra.string='''@page{size:400px 1600px;margin:0}html,body{margin:0;width:400px}body{font-family:DejaVu Sans,sans-serif;font-size:13px}.form-preview{width:100%;padding:10px;border:1px solid #c7d1df;border-radius:8px;background:#fff;color:#18243b;min-height:39px}details{display:block}summary{display:block}.power-button:disabled{opacity:1}button{font-family:DejaVu Sans,sans-serif}#powerLabel{display:inline}#status:empty,#stateDetail:empty{display:none}.body{padding:14px 20px}.support{margin-top:0}.note{margin:10px 0}header{padding:16px 20px}header small{font-size:10px}header img{vertical-align:middle}header>div:first-child{flex:1}header h1{white-space:nowrap}header .form-preview{width:155px}button{display:block;min-height:38px;line-height:1.3}.buttons button{width:50%}#diagnose{margin-top:10px}''';soup.head.append(extra)
 pdf=HTML(string=str(soup),base_url=str(root)).write_pdf();doc=fitz.open(stream=pdf,filetype='pdf');pix=doc[0].get_pixmap(matrix=fitz.Matrix(96/72,96/72),alpha=False);pix.save(root/'store/assets'/('preview-'+mode+'.png'))
 print(mode,len(pdf))
