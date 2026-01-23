"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-white dark:bg-gray-950">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
              <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Erro crítico
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Ocorreu um erro crítico na aplicação. Por favor, recarregue a página.
            </p>
            
            {error.digest && (
              <p className="text-xs text-gray-500 mb-6 font-mono">
                Código: {error.digest}
              </p>
            )}
            
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar página
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
