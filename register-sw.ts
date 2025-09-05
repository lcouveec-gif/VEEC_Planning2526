if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ Service Worker enregistré :', registration);
      })
      .catch((err) => {
        console.error('❌ Échec enregistrement SW :', err);
      });
  });
}