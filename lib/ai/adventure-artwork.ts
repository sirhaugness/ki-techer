const presets: Record<string, string> = {
  'Star Wars': 'star-wars',
  Dinosaurer: 'dinosaurs',
  Fotball: 'football',
  Verdensrommet: 'space',
  Dyr: 'animals',
  Bygging: 'building',
};
/** Only public interest labels leave the app, never answers or learner data. */
export async function adventureArtwork(label: string, online: boolean) {
  if (presets[label])
    return {
      url: `/adventure/${presets[label]}.jpg`,
      alt: `Fra eventyret om ${label}`,
    };
  if (!online) return undefined;
  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(label)}`,
      {
        signal: AbortSignal.timeout(1500),
        headers: { 'User-Agent': 'LeoAdventure/1.0' },
      },
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    const url = new URL(data.thumbnail?.source);
    if (
      url.protocol !== 'https:' ||
      !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname)
    )
      return undefined;
    return { url: url.href, alt: `Fra eventyret om ${label}` };
  } catch {
    return undefined;
  }
}
