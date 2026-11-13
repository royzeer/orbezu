import { useEffect, useState } from 'react'

function parse() {
  const h = window.location.hash.replace(/^#/, '') || '/'
  return h.split('?')[0].split('/').filter(Boolean)
}

export function useRoute() {
  const [parts, setParts] = useState(parse)
  useEffect(() => {
    const on = () => {
      setParts(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parts
}

export function go(path) {
  window.location.hash = path
}
