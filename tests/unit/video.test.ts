import { describe, expect, it } from 'vitest'
import { parseVideoUrl } from '@/modules/profile/lib/video'

describe('parseVideoUrl', () => {
  it('reconoce los formatos de YouTube', () => {
    for (const u of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoUrl(u)).toEqual({ provider: 'youtube', id: 'dQw4w9WgXcQ', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' })
    }
  })

  it('reconoce Vimeo', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')?.src).toBe('https://player.vimeo.com/video/76979871?dnt=1')
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871')?.id).toBe('76979871')
  })

  it('rechaza todo lo demás', () => {
    for (const u of [
      'javascript:alert(1)', 'https://evil.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=<script>',
      'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'https://vimeo.com/abc', 'no es un link', null, 42,
    ]) {
      expect(parseVideoUrl(u)).toBeNull()
    }
  })
})
