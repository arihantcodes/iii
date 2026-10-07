import 'server-only'

import { getCommunityStats } from '@/lib/community'

export type PageStats = {
  stars: number | null
  contributors: number | null
  /** Workers listed at workers.iii.dev, counted by hand on 2026-10-03. */
  workers: number
  /** Adoption, as the 2026-10-05 sync asked for: the SDK on each package registry, plus the engine image. */
  downloads: {
    npmWeek: number
    pypiWeek: number
    crates90d: number
    dockerPulls: number
  }
}

/**
 * Last good reading of each registry, checked 2026-10-07. Used only when an API is unreachable, so the
 * section never shows a dash where a real figure belongs.
 */
const DOWNLOADS_FALLBACK: PageStats['downloads'] = {
  npmWeek: 31_901,
  pypiWeek: 2_857,
  crates90d: 45_456,
  dockerPulls: 117_940,
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'iii.dev (https://iii.dev)' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

/** Contributor count from the GitHub API pagination header; null when unreachable. */
async function getContributors(): Promise<number | null> {
  try {
    const res = await fetch('https://api.github.com/repos/iii-hq/iii/contributors?per_page=1&anon=true', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const last = res.headers.get('link')?.match(/[?&]page=(\d+)>; rel="last"/)
    return last ? Number(last[1]) : 1
  } catch {
    return null
  }
}

/** `iii-sdk` on npm, PyPI and crates.io, and the `iiidev/iii` engine image on Docker Hub. */
async function getDownloads(): Promise<PageStats['downloads']> {
  const [npm, pypi, crates, docker] = await Promise.all([
    getJson<{ downloads: number }>('https://api.npmjs.org/downloads/point/last-week/iii-sdk'),
    getJson<{ data: { last_week: number } }>('https://pypistats.org/api/packages/iii-sdk/recent'),
    getJson<{ crate: { recent_downloads: number } }>('https://crates.io/api/v1/crates/iii-sdk'),
    getJson<{ pull_count: number }>('https://hub.docker.com/v2/repositories/iiidev/iii/'),
  ])
  return {
    npmWeek: npm?.downloads ?? DOWNLOADS_FALLBACK.npmWeek,
    pypiWeek: pypi?.data.last_week ?? DOWNLOADS_FALLBACK.pypiWeek,
    crates90d: crates?.crate.recent_downloads ?? DOWNLOADS_FALLBACK.crates90d,
    dockerPulls: docker?.pull_count ?? DOWNLOADS_FALLBACK.dockerPulls,
  }
}

export async function getPageStats(): Promise<PageStats> {
  const [community, contributors, downloads] = await Promise.all([
    getCommunityStats(),
    getContributors(),
    getDownloads(),
  ])
  /* 54 is the count the team quoted on 2026-10-05; shown only if GitHub's API is unreachable. */
  return { stars: community.starsCount, contributors: contributors ?? 54, workers: 96, downloads }
}
