import http from "k6/http";
import { check } from "k6";

export const options = { vus: 20, duration: "15s" };

export default function () {
  const res = http.post(
    "http://127.0.0.1:3000/auth/register",
    JSON.stringify({
      email: `load-${__VU}-${__ITER}@example.com`,
      password: "correct horse battery",
    }),
    { headers: { "content-type": "application/json" } },
  );
  check(res, {
    "201 created": (r) => r.status === 201,
    "cut mid-flight (reset/EOF)": (r) => /reset|EOF/i.test(r.error),
    "refused before send": (r) => /refused/i.test(r.error),
    "503 while closing": (r) => r.status === 503,
  });
}
