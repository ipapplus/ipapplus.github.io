"""Run the real import/index pipeline in isolation, suppressing Git publication."""
import json, os, pathlib, shutil, subprocess, tempfile, time
ROOT = pathlib.Path(__file__).resolve().parents[1]
env = dict(os.environ, LC_ALL='C', LANG='C')
with tempfile.TemporaryDirectory(prefix='timestamp-tests-', dir='/private/var/tmp') as directory:
    work = pathlib.Path(directory)
    for name in ('up.sh', 'record-additions.pl', 'latest-additions.json'):
        shutil.copy2(ROOT / name, work / name)
    (work / 'debs').mkdir()
    for deb in (ROOT / 'debs').glob('*.deb'):
        os.link(deb, work / 'debs' / deb.name)
    (work / 'bin').mkdir()
    shim = work / 'bin/git'
    shim.write_text('#!/bin/sh\nexit 0\n')
    shim.chmod(0o755)
    env['PATH'] = str(work / 'bin') + ':' + env['PATH']
    def build():
        subprocess.run(['sh', './up.sh'], cwd=work, env=env, check=True, stdout=subprocess.DEVNULL)
        return (work / 'latest-additions.json').read_bytes()
    before = (work / 'latest-additions.json').read_bytes()
    assert build() == before, 'First rebuild changed historical timestamps'
    index = (work / 'Packages').read_bytes()
    assert build() == before, 'Second rebuild changed historical timestamps'
    assert (work / 'Packages').read_bytes() == index
    def package(version, architecture):
        source = work / 'fixture'
        (source / 'DEBIAN').mkdir(parents=True)
        (source / 'DEBIAN/control').write_text(f'Package: test.timestamp\nVersion: {version}\nArchitecture: {architecture}\nMaintainer: Test\nDescription: Timestamp fixture\n')
        subprocess.run(['dpkg-deb', '--build', str(source), str(work / 'fixture.deb')], env=env, check=True, stdout=subprocess.DEVNULL)
        shutil.rmtree(source)
    start = time.time()
    package('1.0', 'iphoneos-arm64')
    first = build()
    records = json.loads(first)
    added = [e for e in records if e['package'] == 'test.timestamp']
    assert len(added) == 1 and added[0]['version'] == '1.0'
    from datetime import datetime
    stamp = datetime.fromisoformat(added[0]['addedAt'].replace('Z', '+00:00')).timestamp()
    assert start - 1 <= stamp <= time.time()
    time.sleep(1.1)
    package('1.0', 'iphoneos-arm64e')
    assert build() == first, 'Another architecture reset timestamp'
    package('1.0', 'iphoneos-arm')
    assert build() == first, 'Rootful reset timestamp'
    package('1.1', 'iphoneos-arm64')
    second = build()
    added = [e for e in json.loads(second) if e['package'] == 'test.timestamp']
    assert len(added) == 2 and added[0]['addedAt'] != added[1]['addedAt']
    assert build() == second, 'Repeated rebuild reset new version'
    # Corruption must fail closed rather than silently recreate dates.
    (work / 'latest-additions.json').write_text('[] broken')
    assert subprocess.run(['perl', './record-additions.pl', 'Packages'], cwd=work, env=env, stderr=subprocess.DEVNULL).returncode != 0
print('PASS: two stable full rebuilds; new versions once; all three architectures; invalid metadata rejected')
