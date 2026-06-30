import React, {useEffect} from 'react';
import {BffStateProvider} from '@bffless/use-bff-state';

// Docusaurus swizzle target: wraps the entire app. Any hook that needs
// BffStateProvider (e.g. LikeButton via useBffState) must live under this.
//
// baseUrl: '/api' means useBffState('/state/foo') posts to /api/state/foo,
// which is what our BFFless pipeline rules are registered under.
export default function Root({children}: {children: React.ReactNode}) {
  // Navbar carries only a bottom rule at rest; a whisper-shadow fades in once
  // the page is scrolled (design-system.md §6). Toggle a root class the navbar
  // CSS keys off — keeps the rule/shadow logic in custom.css.
  useEffect(() => {
    const onScroll = () => {
      document.documentElement.classList.toggle('nav-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <BffStateProvider
      options={{
        baseUrl: '/api',
        persistence: 'forever',
        staleTime: 5000,
      }}
    >
      {children}
    </BffStateProvider>
  );
}
