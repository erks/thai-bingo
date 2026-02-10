export function $(id: string): HTMLElement | null {
    return document.getElementById(id);
}

export function $$(selector: string): NodeListOf<HTMLElement> {
    return document.querySelectorAll<HTMLElement>(selector);
}

export function show(el: HTMLElement | null): void {
    if (el) el.classList.remove("hidden");
}

export function hide(el: HTMLElement | null): void {
    if (el) el.classList.add("hidden");
}

export function highlightWinLine(pi: number, line: [number, number][]): void {
    line.forEach(([r, c]) => {
        const el = $(`cell-${pi}-${r}-${c}`);
        if (el) el.classList.add("win-glow");
    });
}
