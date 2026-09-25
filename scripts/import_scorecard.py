"""Rebuild the public, minimized college snapshot. No API key required."""
import argparse, csv, hashlib, io, json, pathlib, urllib.request, zipfile
from urllib.parse import urlparse

SOURCE = 'https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_06102026.zip'
ROOT = pathlib.Path(__file__).resolve().parents[1]
STATES = set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split())

def number(value):
    try:
        n = float(value)
        return int(n) if n.is_integer() else n
    except (TypeError, ValueError):
        return None

def url(value):
    if not value or value in ('NULL', 'NA', 'PrivacySuppressed'): return None
    candidate = value if '://' in value else 'https://' + value
    parsed = urlparse(candidate)
    return candidate if parsed.scheme in ('http', 'https') and parsed.hostname else None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--zip', type=pathlib.Path, help='Use an already downloaded official archive')
    args = parser.parse_args()
    raw = args.zip.read_bytes() if args.zip else urllib.request.urlopen(SOURCE, timeout=90).read()
    archive = zipfile.ZipFile(io.BytesIO(raw))
    filename = 'Most-Recent-Cohorts-Institution.csv'
    rows = csv.DictReader(io.TextIOWrapper(archive.open(filename)))
    schools = []
    for row in rows:
        if not (row['CURROPER'] == '1' and row['PREDDEG'] == '3' and row['CONTROL'] in ('1','2') and row['STABBR'] in STATES and (number(row['UGDS']) or 0) > 0): continue
        programs = [key[4:] for key in row if key.startswith('PCIP') and (number(row[key]) or 0) > 0]
        schools.append(dict(
            id=int(row['UNITID']), name=row['INSTNM'], city=row['CITY'], state=row['STABBR'],
            control='Public' if row['CONTROL']=='1' else 'Private nonprofit',
            size=number(row['UGDS']), admissionRate=number(row['ADM_RATE']),
            satAverage=number(row['SAT_AVG']), actMidpoint=number(row['ACTCMMID']),
            netPrice=number(row['NPT4_PUB'] if row['CONTROL']=='1' else row['NPT4_PRIV']),
            tuitionIn=number(row['TUITIONFEE_IN']), tuitionOut=number(row['TUITIONFEE_OUT']),
            website=url(row['INSTURL']), calculator=url(row['NPCURL']), programs=programs, programShares={code:number(row['PCIP'+code]) for code in programs}, family=row['OPEID6'],
        ))
    schools.sort(key=lambda school: school['name'])
    destination = ROOT / 'src/data/colleges.json'
    destination.write_text(json.dumps(schools, ensure_ascii=False, separators=(',',':'))+'\n')
    metadata = dict(source=SOURCE, sourcePage='https://collegescorecard.ed.gov/data/', release='2026-06-10', retrieved='2026-09-24', archiveSha256=hashlib.sha256(raw).hexdigest(), file=filename, count=len(schools), scope='Currently operating, predominantly bachelor-degree, public and private nonprofit institutions in the 50 US states and DC with enrolled undergraduates.', vintage='Most recent non-null cohorts vary by field; release date is not the reporting year of every metric.', fields={'id':'UNITID','programs':'PCIPxx > 0 (share of degrees awarded in broad subject family; not a current program catalog)','programShares':'PCIPxx (broad subject share, capped as a ranking signal)','family':'OPEID6 (institution family, used to limit repeated campuses)','satAverage':'SAT_AVG (average among enrolled score submitters)','actMidpoint':'ACTCMMID','admissionRate':'ADM_RATE (institution-wide)','size':'UGDS','netPrice':'NPT4_PUB / NPT4_PRIV (average annual net price for the defined Title IV cohort, not a personal aid estimate)','tuitionIn':'TUITIONFEE_IN','tuitionOut':'TUITIONFEE_OUT','website':'INSTURL','calculator':'NPCURL'})
    (ROOT / 'src/data/metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(f'Imported {len(schools)} colleges ({destination.stat().st_size:,} bytes). SHA256 {metadata["archiveSha256"]}')

if __name__ == '__main__': main()
