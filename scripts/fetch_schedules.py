import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import re

def fetch_twtc():
    """抓世貿中心展覽檔期"""
    results = []
    url = "https://www.twtc.com.tw/exhibition.aspx?p=home"
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; SunriseExpo/1.0)'}
    try:
        res = requests.get(url, headers=headers, timeout=15)
        res.encoding = 'utf-8'
        soup = BeautifulSoup(res.text, 'html.parser')
        rows = soup.select('table tr')
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 4:
                date_text = cols[0].get_text(strip=True)
                name_tag = cols[1].find('a')
                name = name_tag.get_text(strip=True) if name_tag else cols[1].get_text(strip=True)
                venue = cols[4].get_text(strip=True) if len(cols) > 4 else ''
                # 解析日期 04/14 ~ 04/17
                m = re.search(r'(\d{2}/\d{2})\s*~\s*(\d{2}/\d{2})', date_text)
                if m and name:
                    year = datetime.now().year
                    start_str = f"{year}/{m.group(1)}"
                    end_str = f"{year}/{m.group(2)}"
                    try:
                        start = datetime.strptime(start_str, "%Y/%m/%d")
                        end = datetime.strptime(end_str, "%Y/%m/%d")
                        # 判斷場館類別
                        cat = 'twtc'
                        if '南港' in venue:
                            cat = 'nangang'
                        results.append({
                            "name": name,
                            "start": start.strftime("%Y-%m-%d"),
                            "end": end.strftime("%Y-%m-%d"),
                            "venue": venue,
                            "category": cat
                        })
                    except:
                        pass
    except Exception as e:
        print(f"TWTC fetch error: {e}")
    return results

def fetch_expopark():
    """抓花博爭艷館展覽檔期"""
    results = []
    url = "https://www.expopark.taipei/News_Exhibition.aspx?n=247&sms=9029&page=1&PageSize=100"
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; SunriseExpo/1.0)'}
    try:
        res = requests.get(url, headers=headers, timeout=15)
        res.encoding = 'utf-8'
        soup = BeautifulSoup(res.text, 'html.parser')
        items = soup.select('.pglist-p-list li, .list-content li, article')
        for item in items:
            text = item.get_text(separator=' ', strip=True)
            # 找日期格式 2026/04/17～2026/04/20 或類似
            m = re.search(r'(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})[\s～~\-–]+(\d{4})?[/\-]?(\d{1,2})[/\-](\d{1,2})', text)
            if m:
                name_tag = item.find('a') or item.find('h3') or item.find('h4')
                name = name_tag.get_text(strip=True) if name_tag else text[:40]
                if name:
                    results.append({
                        "name": name,
                        "start": f"{m.group(1)}-{m.group(2).zfill(2)}-{m.group(3).zfill(2)}",
                        "end": f"{m.group(4) or m.group(1)}-{m.group(5).zfill(2)}-{m.group(6).zfill(2)}",
                        "venue": "花博爭艷館",
                        "category": "expo"
                    })
    except Exception as e:
        print(f"Expopark fetch error: {e}")
    return results

def main():
    print("開始抓取展館年度檔期...")
    all_events = []

    twtc_events = fetch_twtc()
    print(f"世貿/南港：抓到 {len(twtc_events)} 筆")
    all_events.extend(twtc_events)

    expo_events = fetch_expopark()
    print(f"花博爭艷館：抓到 {len(expo_events)} 筆")
    all_events.extend(expo_events)

    # 去重複
    seen = set()
    unique = []
    for e in all_events:
        key = e['name'] + e['start']
        if key not in seen:
            seen.add(key)
            unique.append(e)

    # 排序
    unique.sort(key=lambda x: x['start'])

    print(f"總計 {len(unique)} 筆，寫入 schedules.json")
    with open('schedules.json', 'w', encoding='utf-8') as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)
    print("完成！")

if __name__ == '__main__':
    main()
