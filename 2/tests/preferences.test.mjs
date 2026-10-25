import test from 'node:test';
import assert from 'node:assert/strict';
import {setNumerals,digits,number,speedLabel} from '../web/_player/format.js';
import {formatTime,count,trackLabel,size,libraryRoot,folderLabel} from '../web/_player/library-view.js';
import {downloadSize} from '../web/_player/media-actions.js';

test('central display formatting supports both numeral systems without changing source data',()=>{
  const track={id:'files/01.mp3',title:'قصيدة 12',url:'files/01.mp3'};
  const original=JSON.stringify(track);
  for(const style of ['eastern','western']){
    setNumerals(style);const east=style==='eastern';
    assert.equal(digits('10 ١٢'),east?'١٠ ١٢':'10 12');
    assert.equal(formatTime(3605),east?'١:٠٠:٠٥':'1:00:05');
    assert.equal(formatTime(NaN),east?'٠:٠٠':'0:00');
    assert.equal(speedLabel(1.25),east?'١٫٢٥×':'1.25×');
    assert.equal(downloadSize(33190000),east?'٣٣٫١٩ م.ب':'33.19 م.ب');
    assert.equal(size(1000000),east?'١ م.ب':'1 م.ب');
    assert.equal(count(413,'track'),east?'٤١٣ مقطعًا':'413 مقطعًا');
    assert.equal(trackLabel(track),east?'قصيدة ١٢':'قصيدة 12');
    assert.equal(number(14),east?'١٤':'14');
    assert.equal(JSON.stringify(track),original);
  }
  setNumerals('eastern');
});
test('logical narrator root preserves actual identifiers and siblings',()=>{
  const folders=new Map([
    ['',{id:'',children:['files'],tracks:[]}],
    ['files',{id:'files',children:['files/reader'],tracks:[]}],
    ['files/reader',{id:'files/reader',name:'مقاطع صوتية بصوت عبدالرحمن الحميِّن',children:['leaf'],tracks:[]}],
    ['leaf',{id:'leaf',name:'المعلقات',children:[],tracks:['01']}],
  ]);
  assert.equal(libraryRoot(folders),'files/reader');
  assert.equal(folderLabel('files/reader',folders),'مقاطع صوتية بصوت الشيخ الدكتور عبدالرحمن الحميّن');
  folders.get('files').children.push('other');
  assert.equal(libraryRoot(folders),'files');
  assert.equal(folders.get('files/reader').name,'مقاطع صوتية بصوت عبدالرحمن الحميِّن');
});
