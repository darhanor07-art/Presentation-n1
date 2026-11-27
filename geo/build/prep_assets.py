# -*- coding: utf-8 -*-
"""Жер шарына керек деректерді дайындау (бір рет іске қосылады, нәтижесі build/img және build/data ішінде сақталады).

Кіріс (интернеттен жүктелген түпнұсқалар, репозиторийге салынбайды):
  <src>/tex/day.jpg, night.jpg, clouds.jpg   — Solar System Scope Earth текстуралары (CC BY 4.0, NASA деректері негізінде), Wikimedia Commons
  <src>/data/PB2002_boundaries.json           — тектоникалық тақталар шекарасы, Peter Bird (2003), fraxen/tectonicplates (ODC-By 1.0)
  <src>/data/npmw/node_modules/world-atlas/   — Natural Earth (қоғамдық игілік), world-atlas@2 (ISC)

Шығыс:
  img/earth_day.jpg, earth_night.jpg, earth_clouds.jpg
  img/earth_mask.png  — R: құрлық (1) / су (0), G: Қазақстан аумағы
  data/plates.json    — тақта шекаралары [[type, [lon,lat,...]], ...]
  data/kz.json        — Қазақстан шекарасы (lon,lat)

Іске қосу: python3 geo/build/prep_assets.py <src-папка>
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else "."
IMG, DATA = os.path.join(HERE, "img"), os.path.join(HERE, "data")
os.makedirs(IMG, exist_ok=True); os.makedirs(DATA, exist_ok=True)


def topo_features(topo, name):
    """TopoJSON → [(id, [polygon rings в lon/lat])] (кішкентай декодер, topojson-client сияқты)."""
    sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0; pts = []
        for dx, dy in arc:
            x += dx; y += dy; pts.append((x * sc[0] + tr[0], y * sc[1] + tr[1]))
        arcs.append(pts)

    def ring(idx):
        out = []
        for a in idx:
            pts = arcs[a] if a >= 0 else arcs[~a][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    feats = []
    obj = topo["objects"][name]
    geoms = obj["geometries"] if obj["type"] == "GeometryCollection" else [obj]
    for g in geoms:
        polys = [g["arcs"]] if g["type"] == "Polygon" else g["arcs"] if g["type"] == "MultiPolygon" else []
        feats.append((g.get("id"), [[ring(r) for r in poly] for poly in polys]))
    return feats


def unwrap(r):
    """Антимеридиан арқылы өтетін сақинаны үздіксіз ету."""
    out = [list(r[0])]
    for lon, lat in r[1:]:
        p = out[-1][0]
        while lon - p > 180: lon -= 360
        while lon - p < -180: lon += 360
        out.append([lon, lat])
    return out


def draw_ring(dr, r, W, H, fill):
    u = unwrap(r)
    span = u[-1][0] - u[0][0]
    if abs(span) > 300:   # полюсті айналатын сақина (Антарктида)
        pole = -90 if sum(p[1] for p in u) / len(u) < 0 else 90
        u = u + [[u[-1][0], pole], [u[0][0], pole]]
    for shift in (-360, 0, 360):
        pts = [((lon + shift + 180) / 360 * W, (90 - lat) / 180 * H) for lon, lat in u]
        dr.polygon(pts, fill=fill)


def main():
    # 1) текстуралар
    day = Image.open(os.path.join(SRC, "tex", "day.jpg")).convert("RGB")
    day.save(os.path.join(IMG, "earth_day.jpg"), quality=84, optimize=True, progressive=True)
    Image.open(os.path.join(SRC, "tex", "night.jpg")).convert("RGB").save(os.path.join(IMG, "earth_night.jpg"), quality=82, optimize=True)
    Image.open(os.path.join(SRC, "tex", "clouds.jpg")).convert("L").resize((2048, 1024), Image.LANCZOS).save(os.path.join(IMG, "earth_clouds.jpg"), quality=80, optimize=True)

    # 2) құрлық/су маскасы және Қазақстан
    wa = os.path.join(SRC, "data", "npmw", "node_modules", "world-atlas")
    land = json.load(open(os.path.join(wa, "land-50m.json")))
    countries = json.load(open(os.path.join(wa, "countries-50m.json")))
    W, H = 2048, 1024
    mL = Image.new("L", (W, H), 0); dL = ImageDraw.Draw(mL)
    for _, polys in topo_features(land, "land"):
        for poly in polys:
            draw_ring(dL, poly[0], W, H, 255)
            for hole in poly[1:]: draw_ring(dL, hole, W, H, 0)
    mK = Image.new("L", (W, H), 0); dK = ImageDraw.Draw(mK)
    kz_rings = []
    for fid, polys in topo_features(countries, "countries"):
        if str(fid) == "398":   # Қазақстан (ISO 3166-1 numeric)
            for poly in polys:
                draw_ring(dK, poly[0], W, H, 255); kz_rings.append(poly[0])
    mK = mK.filter(ImageFilter.GaussianBlur(1.2))
    Image.merge("RGB", (mL, mK, Image.new("L", (W, H), 0))).save(os.path.join(IMG, "earth_mask.png"), optimize=True)
    kz = [[round(v, 2) for p in r for v in p] for r in kz_rings if len(r) > 8]
    json.dump(kz, open(os.path.join(DATA, "kz.json"), "w"), separators=(",", ":"))

    # 3) тақта шекаралары
    pb = json.load(open(os.path.join(SRC, "data", "PB2002_boundaries.json")))
    out = []
    for f in pb["features"]:
        co = f["geometry"]["coordinates"]
        flat = [round(v, 1) for p in co for v in p]
        out.append([1 if f["properties"].get("Type") == "subduction" else 0, flat])
    json.dump(out, open(os.path.join(DATA, "plates.json"), "w"), separators=(",", ":"))
    for n in sorted(os.listdir(IMG)) + sorted(os.listdir(DATA)):
        p = os.path.join(IMG, n) if os.path.exists(os.path.join(IMG, n)) else os.path.join(DATA, n)
        print(f"{n:22s} {os.path.getsize(p) / 1e3:8.1f} KB")


if __name__ == "__main__":
    main()
