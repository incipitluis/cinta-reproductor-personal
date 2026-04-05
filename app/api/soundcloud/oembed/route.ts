import { NextResponse } from 'next/server';

interface OEmbedData {
  title: string;
  author_name: string;
  thumbnail_url?: string;
  html: string;
  provider_name: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Falta el parámetro url' }, { status: 400 });
  }

  // Validate it's a SoundCloud URL
  if (!url.includes('soundcloud.com/')) {
    return NextResponse.json({ error: 'La URL no corresponde a SoundCloud' }, { status: 400 });
  }

  const oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  let res: Response;
  try {
    res = await fetch(oembedUrl, { headers: { 'User-Agent': 'reproductor-personal/1.0' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo conectar con SoundCloud' }, { status: 502 });
  }

  if (!res.ok) {
    const status = res.status === 404 ? 404 : 502;
    return NextResponse.json(
      { error: status === 404 ? 'Pista no encontrada o privada' : 'Error de SoundCloud' },
      { status },
    );
  }

  const data: OEmbedData = await res.json();

  return NextResponse.json({
    title: data.title,
    artist: data.author_name,
    cover_url: data.thumbnail_url ?? null,
  });
}
