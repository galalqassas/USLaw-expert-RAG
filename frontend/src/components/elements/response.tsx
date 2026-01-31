import { cn } from "@/lib/utils";

export const Response = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none break-words",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
