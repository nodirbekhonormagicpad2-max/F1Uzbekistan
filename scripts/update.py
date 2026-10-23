
import json
import urllib.request
import urllib.error
import urllib.parse
import datetime
import pathlib
import time

BASE = "https://api.openf1.org/v1/"
ROOT = pathlib.Path(__file__).resolve().parents[1]
FILE = ROOT / "latest-session.json"


def get(endpoint, params):
    url = BASE + endpoint + "?" + urllib.parse.urlencode(params)

    for attempt in range(4):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "F1UzbekistanTV/1.0"}
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                return json.load(response)

        except urllib.error.HTTPError as e:
            print(f"OpenF1 HTTP error: {e.code}")

            if e.code == 401:
                print(
                    "Data is not publicly available yet. "
                    "Will try again on the next scheduled run."
                )
                return None

            if e.code not in (429, 500, 502, 503, 504):
                raise

        except (urllib.error.URLError, TimeoutError) as e:
            print("Network error:", e)

        if attempt < 3:
            time.sleep(5 * (2 ** attempt))

    print("OpenF1 API unavailable after retries")
    return None


def parse(value):
    return datetime.datetime.fromisoformat(
        value.replace("Z", "+00:00")
    )


def run():
    now = datetime.datetime.now(datetime.timezone.utc)

    try:
        sessions = get("sessions", {"year": now.year})

        if not sessions:
            print("Sessions unavailable; keeping old results")
            return

    except Exception as e:
        print("Cannot load sessions:", e)
        return

    ended = sorted(
        (
            s for s in sessions
            if s.get("date_end")
            and parse(s["date_end"]) < now
        ),
        key=lambda s: s["date_end"],
        reverse=True
    )

    for s in ended[:12]:
        key = s["session_key"]

        try:
            results = get(
                "session_result",
                {"session_key": key}
            )

            if not results:
                print("Results unavailable:", key)
                continue

            drivers = get(
                "drivers",
                {"session_key": key}
            )

            if drivers is None:
                print("Driver data unavailable:", key)
                continue

            bynum = {
                d["driver_number"]: d
                for d in drivers
            }

            rows = []

            for r in results:
                pos = r.get("position")

                if not isinstance(pos, int) or pos < 1:
                    continue

                d = bynum.get(r.get("driver_number"), {})
                duration = r.get("duration")
                gap = r.get("gap_to_leader")

                if isinstance(duration, list):
                    duration = min(
                        (
                            x for x in duration
                            if isinstance(x, (int, float))
                        ),
                        default=None
                    )

                if isinstance(duration, (int, float)):
                    timing = str(duration)

                elif isinstance(gap, (int, float)):
                    timing = "+" + str(gap)

                else:
                    timing = str(gap or "—")

                rows.append({
                    "position": pos,
                    "name": (
                        d.get("broadcast_name")
                        or d.get("full_name")
                        or "#" + str(r.get("driver_number"))
                    ),
                    "team": d.get("team_name", ""),
                    "time": timing
                })

            rows.sort(key=lambda x: x["position"])

            if len(rows) < 3:
                print("Incomplete results:", key)
                continue

            data = {
                "session": s.get("session_name", "Sessiya"),
                "meeting": s.get("country_name", ""),
                "date": s["date_end"],
                "updated": now.isoformat(),
                "results": rows
            }

            if FILE.exists():
                try:
                    old = json.loads(
                        FILE.read_text(encoding="utf-8")
                    )

                    if (
                        old.get("session") == data["session"]
                        and old.get("date") == data["date"]
                        and old.get("results") == data["results"]
                    ):
                        print("Results already up to date")
                        return

                except (OSError, ValueError):
                    pass

            FILE.write_text(
                json.dumps(
                    data,
                    ensure_ascii=False,
                    indent=2
                ) + "\n",
                encoding="utf-8"
            )

            print(
                "Successfully updated:",
                data["session"],
                data["meeting"]
            )
            return

        except Exception as e:
            print("Skipping session:", key, e)

    print("No new results; keeping previous data")


if __name__ == "__main__":
    run()
