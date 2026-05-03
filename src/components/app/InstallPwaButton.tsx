"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandalone = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

export function InstallPwaButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed) {
    return (
      <p className="text-xs text-caramel">
        Ứng dụng đã được cài trên máy này.
      </p>
    );
  }

  if (!promptEvent) {
    return (
      <p className="text-xs text-caramel">
        Mở bằng trình duyệt trên điện thoại, vào menu trình duyệt và chọn thêm vào màn hình chính.
      </p>
    );
  }

  return (
    <Button
      className="w-full rounded-full sm:w-auto"
      variant="outline"
      disabled={installing}
      onClick={async () => {
        setInstalling(true);
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === "accepted") {
            setPromptEvent(null);
          }
        } finally {
          setInstalling(false);
        }
      }}
    >
      <Download className="h-4 w-4" />
      {installing ? "Đang mở cài đặt..." : "Cài ứng dụng"}
    </Button>
  );
}
