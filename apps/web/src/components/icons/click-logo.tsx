import { cn } from "@/lib/utils"

interface ClickLogoProps {
  variant?: "icon" | "full"
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  iconClassName?: string
  textClassName?: string
}

const sizeMap = {
  sm: { icon: "w-5 h-5", text: "text-base", gap: "gap-1.5" },
  md: { icon: "w-6 h-6", text: "text-lg", gap: "gap-2" },
  lg: { icon: "w-7 h-7", text: "text-xl", gap: "gap-2.5" },
  xl: { icon: "w-10 h-10", text: "text-2xl", gap: "gap-3" },
}

export function ClickLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 33 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M14.5329 27.4026C13.4861 28.4545 13.4861 30.1598 14.5329 31.2118C15.5798 32.2637 17.2771 32.2637 18.324 31.2118C19.3709 30.1598 19.3709 28.4545 18.324 27.4026L16.4285 25.498L14.5329 27.4026Z"
        fill="currentColor"
      />
      <path
        d="M14.3699 2.51555e-07L18.4858 3.23607e-07L18.4858 16.8655L29.239 6.05653L32.1494 8.98083L22.6017 18.5785L32.8556 18.5785L32.8556 22.7141L6.06375e-05 22.7141L6.07099e-05 18.5785L10.2539 18.5785L0.706134 8.98083L3.61652 6.05653L14.3699 16.8655L14.3699 2.51555e-07Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function ClickLogo({
  variant = "full",
  size = "md",
  className,
  iconClassName,
  textClassName,
}: ClickLogoProps) {
  const sizes = sizeMap[size]

  if (variant === "icon") {
    return <ClickLogoIcon className={cn(sizes.icon, className, iconClassName)} />
  }

  return (
    <div className={cn("flex items-center", sizes.gap, className)}>
      <ClickLogoIcon className={cn(sizes.icon, iconClassName)} />
      <span className={cn("font-bold tracking-tight", sizes.text, textClassName)}>
        ClickMedicos
      </span>
    </div>
  )
}
