'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPreviewAudio, type PreviewAudio } from 'bigcursor/internal';
const Context = createContext<{
  audio: React.RefObject<PreviewAudio | null>;
  enabled: boolean;
  toggle: () => void;
  error: string;
} | null>(null);
export function DemoAudioProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<PreviewAudio | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  useEffect(
    () => () => {
      audio.current?.dispose();
      audio.current = null;
    },
    [],
  );
  function toggle() {
    if (audio.current) {
      audio.current.dispose();
      audio.current = null;
      setEnabled(false);
      return;
    }
    setError('');
    const engine = createPreviewAudio();
    audio.current = engine;
    // Both contexts resume inside the gesture, including on mobile Safari.
    void engine
      .resume()
      .then(() => {
        if (audio.current === engine) setEnabled(true);
      })
      .catch(() => {
        if (audio.current !== engine) return;
        engine.dispose();
        audio.current = null;
        setEnabled(false);
        setError('Sound could not start. Try enabling it again.');
      });
  }
  return <Context.Provider value={{ audio, enabled, toggle, error }}>{children}</Context.Provider>;
}
export function useDemoAudio() {
  const value = useContext(Context);
  if (!value) throw new Error('Demo audio provider is missing.');
  return value;
}
export function DemoSoundToggle({ prominent = false }: { prominent?: boolean }) {
  const { enabled, toggle, error } = useDemoAudio();
  return (
    <div>
      <button
        type="button"
        className={`secondary ${prominent ? 'min-h-11 px-6 text-base' : 'text-sm'}`}
        aria-pressed={enabled}
        onClick={toggle}
      >
        {prominent
          ? enabled
            ? 'Clicking and typing sounds on'
            : 'Enable clicking and typing sounds'
          : enabled
            ? 'Sound on'
            : 'Enable sound'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
