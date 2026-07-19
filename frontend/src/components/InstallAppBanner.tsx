import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Banner discreto que aparece quando o navegador (Chrome/Android)
 * sinaliza que o Nexus AI pode ser instalado como PWA. Em iOS/Safari
 * nao existe esse evento - a instalacao e feita via
 * Compartilhar > "Adicionar a Tela de Inicio", entao o banner nao
 * aparece la (nao ha como programar esse fluxo).
 */
export function InstallAppBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('nexus_install_dismissed') === '1');

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!installEvent || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem('nexus_install_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-900 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-gray-300">
        <Download size={15} className="text-signal-400" />
        Instale o Nexus AI no seu aparelho para acesso rapido.
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={async () => {
            await installEvent.prompt();
            setInstallEvent(null);
          }}
          className="rounded-md bg-nexus-600 px-3 py-1 text-xs font-medium text-white hover:bg-nexus-500"
        >
          Instalar
        </button>
        <button onClick={dismiss} className="text-gray-500 hover:text-gray-300">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
