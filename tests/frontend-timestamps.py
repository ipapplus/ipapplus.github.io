"""Test actual frontend functions with JavaScriptCore or Node: python3 tests/frontend-timestamps.py [runner]."""
from pathlib import Path
import json, re, shutil, subprocess, sys, tempfile
root = Path(__file__).resolve().parents[1]
site = (root / 'website.js').read_text()
cards = (root / 'packages.js').read_text()
history = json.loads((root / 'latest-additions.json').read_text())
functions = cards[cards.index('  function text('):cards.index('  function parsePackages(')] + cards[cards.index('  function createEntry('):cards.index('  function filterPackages(')]
mapping = re.search(r'addedDates=new Map\(history.map.*', cards).group()
TEMPLATE = r"""const window={}; const document={createElement:()=>({children:[],appendChild(x){this.children.push(x)},setAttribute(){},addEventListener(){}})};
__SITE__
const RepoUI=window.RepoUI;
const history=__HISTORY__;
let addedDates;__MAPPING__
const cardEntries=new WeakMap(),icons={download:'',copy:''},order=['iphoneos-arm','iphoneos-arm64','iphoneos-arm64e'];
const downloadURL=()=>null;
function assert(ok,label){if(!ok)throw new Error(label)}
const now=Date.parse('2026-10-03T20:00:00Z');
for(const [ms,label] of [[0,'1m ago'],[59000,'1m ago'],[60000,'1m ago'],[3599000,'59m ago'],[3600000,'1h ago'],[86399000,'23h ago'],[86400000,'1d ago'],[172800000,'2d ago'],[-60000,'1m ago']])assert(RepoUI.additionTime(new Date(now-ms),now)===label,label);
assert(RepoUI.additionTime(new Date('invalid'),now)==='','invalid');
assert(RepoUI.relativeTime(new Date(now+60000),now)==='Just now','future');
assert(RepoUI.additionTime(new Date('2026-10-03T19:00:00Z'),now)===RepoUI.additionTime(new Date('2026-10-03T22:00:00+03:00'),now),'timezone');
__FUNCTIONS__
const fixtures=[['com.eolnmsuk.netshield','2.2.7','2026-10-02T10:21:19Z'],['com.eolnmsuk.netshield','2.2.8','2026-10-03T16:47:26Z'],['com.p2kdev.underdock','1.3','2026-10-02T22:15:42Z']];
for(const [Package,Version,expected] of fixtures){
 for(const Architecture of order){const entry=createEntry([{Package,Version,Architecture}],0);assert(entry.addedAt===expected,'version lookup');assert(entry.addedTime.dateTime===expected,'time attribute');assert(entry.addedTime.textContent===RepoUI.additionTime(new Date(expected)),'card relative time');}
}
assert(RepoUI.additionTime(new Date(fixtures[0][2]),now)!==RepoUI.additionTime(new Date(fixtures[1][2]),now),'NetShield ages differ');
'PASS: actual card creation and history mapping; minutes/hours/days; invalid/future; UTC/offset equivalence; three architectures'
"""
script = TEMPLATE.replace('__SITE__', site).replace('__HISTORY__', json.dumps(history)).replace('__MAPPING__', mapping).replace('__FUNCTIONS__', functions)
runner = sys.argv[1] if len(sys.argv) > 1 else shutil.which('node')
if not runner:
    raise SystemExit('Supply a JavaScript runner accepting a script path, or install Node.')
with tempfile.TemporaryDirectory(dir='/private/var/tmp') as directory:
    target = Path(directory) / 'test.js'
    target.write_text(script)
    argument = str(target.resolve())
    # Native Apple frameworks see the system path outside this shell's rootfs alias.
    if argument.startswith('/rootfs/'):
        argument = argument[len('/rootfs'):]
    subprocess.run([runner, argument], check=True)
print('PASS: frontend timestamp checks')
