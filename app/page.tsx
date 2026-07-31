export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Plateforme des applications clients
      </h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        Chaque application est accessible sous{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
          /&lt;client&gt;/&lt;app&gt;
        </code>
        .
      </p>
    </div>
  );
}
