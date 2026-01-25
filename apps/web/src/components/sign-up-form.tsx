import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { trpcClient } from "@/utils/trpc";

import Loader from "./loader";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: async () => {
            toast.success("Conta criada com sucesso");
            
            try {
              const { user } = await trpcClient.me.query();
               router.push(user?.tipo === "medico" ? "/dashboard/horarios" : "/dashboard");
            } catch {
              router.push("/dashboard");
            }
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  return (
    <Card className="border border-border bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Criar sua conta
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Comece a gerenciar sua agenda medica hoje
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-5"
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Nome completo
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Dr. Joao Silva"
                  className="h-11 bg-background/50 focus:bg-background transition-colors"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="seu@email.com"
                  className="h-11 bg-background/50 focus:bg-background transition-colors"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  Senha
                </Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  placeholder="••••••••"
                  className="h-11 bg-background/50 focus:bg-background transition-colors"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimo de 8 caracteres
                </p>
                {field.state.meta.errors.map((error) => (
                  <p key={error?.message} className="text-sm text-destructive animate-in fade-in slide-in-from-top-1">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>

          <form.Subscribe>
            {(state) => (
              <Button
                type="submit"
                size="lg"
                className="w-full h-11 text-sm font-semibold transition-all"
                disabled={!state.canSubmit || state.isSubmitting}
              >
                {state.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Criando conta...
                  </span>
                ) : (
                  "Criar conta"
                )}
              </Button>
            )}
          </form.Subscribe>

          <p className="text-xs text-center text-muted-foreground leading-relaxed">
            Ao criar uma conta, voce concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">Termos de Uso</a>
            {" "}e{" "}
            <a href="#" className="text-primary hover:underline">Politica de Privacidade</a>
          </p>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Ja tem uma conta?{" "}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-semibold text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            Fazer login
          </button>
        </p>
      </CardContent>
    </Card>
  );
}
