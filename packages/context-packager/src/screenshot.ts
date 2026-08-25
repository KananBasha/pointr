export async function screenshotElement(element: HTMLElement): Promise<{ base64: string; width: number; height: number }> {
  try {
    return await Promise.race([
      new Promise<{ base64: string; width: number; height: number }>(resolve => {
        try {
          const rect = element.getBoundingClientRect();
          const canvas = document.createElement('canvas');
          canvas.width = rect.width;
          canvas.height = rect.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(0, 0, rect.width, rect.height);
          }
          resolve({
            base64: canvas.toDataURL('image/png'),
            width: rect.width,
            height: rect.height
          });
        } catch {
          resolve({ base64: '', width: 0, height: 0 });
        }
      }),
      new Promise<{ base64: string; width: number; height: number }>(resolve => {
        setTimeout(() => resolve({ base64: '', width: 0, height: 0 }), 500);
      })
    ]);
  } catch (e) {
    return { base64: '', width: 0, height: 0 };
  }
}
