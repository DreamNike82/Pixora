import { useEffect } from 'react'

type PageMeta = {
  title: string
  description?: string
  /** Приватні сторінки (кабінет, галерея за токеном) не індексуються */
  noindex?: boolean
  /** Шлях для canonical і og:url, напр. "/" */
  path?: string
}

const SUFFIX = 'Pixora'

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string | null) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!href) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

/**
 * Оновлює title, description, robots, canonical та Open Graph під час навігації в SPA.
 * Статичні значення за замовчуванням лежать в index.html (їх читають боти без JavaScript).
 */
export default function usePageMeta({ title, description, noindex = false, path }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes(SUFFIX) ? title : `${title} — ${SUFFIX}`
    document.title = fullTitle
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('name', 'twitter:title', fullTitle)
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
      upsertMeta('name', 'twitter:description', description)
    }
    if (noindex || path === undefined) {
      setCanonical(null)
    } else {
      const url = `${__SITE_URL__}${path}`
      setCanonical(url)
      upsertMeta('property', 'og:url', url)
    }
  }, [title, description, noindex, path])
}
