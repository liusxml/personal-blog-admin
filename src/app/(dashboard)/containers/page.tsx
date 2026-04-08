export default function ContainersPage() {
    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
            <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
                <div>
                    <h2 className="text-base font-semibold">容器监控</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        实时查看所有 Docker 容器日志与运行状态
                    </p>
                </div>
                <a
                    href="/dozzle"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    在新标签页中打开 ↗
                </a>
            </div>
            <iframe
                src="/dozzle"
                className="flex-1 w-full border-0"
                title="Dozzle 容器日志监控"
                // 允许同源 iframe（Dozzle 通过 Next.js 代理，与 Admin 同域）
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
        </div>
    )
}
