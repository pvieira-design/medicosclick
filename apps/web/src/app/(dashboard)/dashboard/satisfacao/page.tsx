"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SatisfacaoModal } from "@/components/formularios/SatisfacaoModal";

export default function SatisfacaoPage() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      router.push("/dashboard");
    }
  };

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Pesquisa de Satisfação
        </h1>
        <p className="text-muted-foreground">
          Sua opinião é muito importante para melhorarmos nossos serviços.
        </p>
      </div>

      <SatisfacaoModal open={open} onOpenChange={handleOpenChange} />
    </div>
  );
}
