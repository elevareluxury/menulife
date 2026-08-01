import { useMemo } from 'react'
import type { HubC } from '@/modules/hub/lib/themeConfig'

interface VideoBlockProps {
  config: {
    url?: string
    title?: string
    autoplay?: boolean
  }
  C: HubC
}

interface EmbedResult {
  src: string
  aspectRatio: string
}

function detectEmbed(url: string): EmbedResult | null {
  if (!url) return null

  // YouTube (watch, embed, shorts, youtu.be)
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (ytMatch) {
    return {
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
      aspectRatio: '16/9',
    }
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return {
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      aspectRatio: '16/9',
    }
  }

  // TikTok
  const tiktokMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
  if (tiktokMatch) {
    return {
      src: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      aspectRatio: '9/16',
    }
  }

  // Instagram (reels y posts)
  const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([\w-]+)/)
  if (igMatch) {
    return {
      src: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      aspectRatio: '9/16',
    }
  }

  return null
}

export function VideoBlock({ config, C }: VideoBlockProps) {
  const { url = '', title } = config
  const embed = useMemo(() => detectEmbed(url), [url])

  if (!embed) return null

  return (
    <section style={{ width: '100%', padding: '0 20px', paddingTop: 32 }}>
      {title && (
        <p style={{
          fontFamily: "'Syne',sans-serif",
          fontSize: 14, fontWeight: 700,
          color: C.t3, textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: 12,
        }}>
          {title}
        </p>
      )}
      <div style={{
        position: 'relative',
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        background: C.sur,
        border: `1px solid ${C.bdr}`,
        aspectRatio: embed.aspectRatio,
      }}>
        <iframe
          src={embed.src}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%', border: 'none',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          title={title || 'Video'}
        />
      </div>
    </section>
  )
}
