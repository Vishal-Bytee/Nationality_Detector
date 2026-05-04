import cv2
import numpy as np
from deepface import DeepFace
import json
import os

# ye file main logic handle krta hai
# deepface se face analysis krke result return karta hai

def make_serializable(obj):
    # numpy types ko normal python types me convert kro
    # warna json me error aata hai
    if isinstance(obj, dict):
        return {k: make_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_serializable(i) for i in obj]
    elif hasattr(obj, 'item'):
        return obj.item()
    return obj


# nationality mapping 
race_map = {
    'asian':           {'label': 'Asian',            'flag': '🌏'},
    'indian':          {'label': 'Indian',            'flag': '🇮🇳'},
    'black':           {'label': 'African',           'flag': '🌍'},
    'white':           {'label': 'American/European', 'flag': '🇺🇸'},
    'middle eastern':  {'label': 'Middle Eastern',    'flag': '🕌'},
    'latino hispanic': {'label': 'Latino/Hispanic',   'flag': '🌎'},
}

emo_map = {
    'happy':   '😄',
    'sad':     '😢',
    'angry':   '😠',
    'fear':    '😨',
    'surprise':'😲',
    'disgust': '🤢',
    'neutral': '😐'
}

# dress colour ranges in HSV
colour_ranges = {
    'Red':    [([0,80,70],[10,255,255]), ([170,80,70],[180,255,255])],
    'Orange': [([11,80,70],[25,255,255])],
    'Yellow': [([26,80,70],[34,255,255])],
    'Green':  [([35,50,50],[85,255,255])],
    'Blue':   [([86,80,70],[130,255,255])],
    'Purple': [([131,50,50],[160,255,255])],
    'Pink':   [([161,50,100],[175,255,255])],
    'White':  [([0,0,200],[180,30,255])],
    'Black':  [([0,0,0],[180,255,50])],
    'Gray':   [([0,0,51],[180,30,199])],
    'Brown':  [([10,50,20],[20,180,120])],
}


def get_dress_colour(img, face_bottom, h, w):
    # face ke niche ka area crop kro - wahan dress hogi
    y1 = min(face_bottom + 10, h-1)
    y2 = min(face_bottom + int(h*0.35), h)
    x1 = max(0, w//4)
    x2 = min(w, 3*w//4)

    crop = img[y1:y2, x1:x2]
    if crop.size == 0:
        return 'Unknown', '#888888'

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    best = 'Unknown'
    best_cnt = 0

    for cname, ranges in colour_ranges.items():
        mask = None
        for lo, hi in ranges:
            m = cv2.inRange(hsv, np.array(lo), np.array(hi))
            mask = m if mask is None else cv2.bitwise_or(mask, m)
        cnt = int(np.sum(mask > 0))
        if cnt > best_cnt:
            best_cnt = cnt
            best = cname

    mean_bgr = cv2.mean(crop)[:3]
    hex_col = '#{:02x}{:02x}{:02x}'.format(int(mean_bgr[2]), int(mean_bgr[1]), int(mean_bgr[0]))
    return best, hex_col


def fix_age(val):
    try:
        return abs(int(float(str(val))))
    except:
        return 0


def analyze_face(img_path):
    img = cv2.imread(img_path)
    if img is None:
        raise ValueError("image nahi padi - check kro path")

    print("image loaded, size:", img.shape)

    h, w = img.shape[:2]
    if max(h, w) > 640:
        sc = 640 / max(h, w)
        img = cv2.resize(img, (int(w*sc), int(h*sc)))
        cv2.imwrite(img_path, img)
        h, w = img.shape[:2]

    res = DeepFace.analyze(
        img_path=img_path,
        actions=['age', 'gender', 'race', 'emotion'],
        enforce_detection=False,
        detector_backend='ssd',
        silent=True
    )

    print("deepface done")

    # list ya dict dono handle kro
    face = res[0] if isinstance(res, list) else res

    # race/nationality
    race_scores = face.get('race', {})
    dom_race = face.get('dominant_race', 'white').lower()
    info = race_map.get(dom_race, {'label': dom_race.title(), 'flag': '🌐'})

    total = float(sum(race_scores.values())) or 1.0
    race_chart = [
        {
            'name': race_map.get(k, {'label': k.title()})['label'],
            'confidence': round(float(v)/total*100, 1)
        }
        for k, v in sorted(race_scores.items(), key=lambda x: -x[1])
    ][:5]

    # emotion
    emo_scores = face.get('emotion', {})
    dom_emo = face.get('dominant_emotion', 'neutral').lower()
    total_e = float(sum(emo_scores.values())) or 1.0
    emo_chart = [
        {
            'name': k.title(),
            'confidence': round(float(v)/total_e*100, 1)
        }
        for k, v in sorted(emo_scores.items(), key=lambda x: -x[1])
    ][:5]

    # age fix - negative nahi aana chahiye
    age = fix_age(face.get('age', 0))
    print("age:", age)

    region = face.get('region', {})
    face_bottom = region.get('y', 0) + region.get('h', h//3)
    dress, dress_hex = get_dress_colour(img, face_bottom, h, w)

    conf = round(float(race_scores.get(dom_race, 0))/total*100, 1)

    cat = dom_race.lower()

    out = {
        'nationality':   info['label'],
        'flag':          info['flag'],
        'confidence':    conf,
        'emotion':       dom_emo.title(),
        'emotion_emoji': emo_map.get(dom_emo, '😐'),
        'race_chart':    race_chart,
        'emotion_chart': emo_chart,
        'show_age':      False,
        'show_dress':    False,
        'age':           age,
        'dress_colour':  dress,
        'dress_hex':     dress_hex,
    }

    if cat == 'indian':
        out['show_age'] = True
        out['show_dress'] = True
    elif cat in ('white', 'american'):
        out['show_age'] = True
        out['show_dress'] = False
    elif cat == 'black':
        out['show_age'] = False
        out['show_dress'] = True

    return make_serializable(out)