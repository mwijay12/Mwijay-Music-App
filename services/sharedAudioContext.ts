import * as Tone from 'tone';

export function getSharedAudioContext(): AudioContext {
  const ctx = Tone.getContext().rawContext as AudioContext;
  return ctx;
}

export async function resumeSharedContext(): Promise<void> {
  try {
    await Tone.start();
    const ctx = getSharedAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    console.log('[SharedCtx] Context state:', ctx.state);
  } catch (e) {
    console.warn('[SharedCtx] Resume failed:', e);
  }
}

export function isContextReady(): boolean {
  try {
    const ctx = Tone.getContext().rawContext as AudioContext;
    return ctx.state === 'running';
  } catch {
    return false;
  }
}
