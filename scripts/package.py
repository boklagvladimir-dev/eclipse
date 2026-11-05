"""Build a Chrome Web Store upload ZIP containing runtime files only."""
import json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
version=json.loads((root/'manifest.json').read_text())['version']
output=root/'dist'/f'eclipse-{version}.zip'
output.parent.mkdir(exist_ok=True)
files=[root/'manifest.json',root/'popup.html',*sorted(root.glob('*.js')),*sorted((root/'icons').glob('*.png'))]
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
 for file in files:
  if file.name=='eclipse-master.png':continue
  z.write(file,file.relative_to(root))
with zipfile.ZipFile(output) as z:
 assert 'manifest.json' in z.namelist()
 assert json.loads(z.read('manifest.json'))['version']==version
print(output)
