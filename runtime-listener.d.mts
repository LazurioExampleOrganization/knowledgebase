export interface ModuleListener {
  readonly host: string;
  readonly port: number;
}

export declare const mainListener: ModuleListener;
export declare const editorListener: ModuleListener;

export declare function resolveMainListener(
  env?: Record<string, string | undefined>,
): ModuleListener;

export declare function resolveEditorListener(
  env?: Record<string, string | undefined>,
): ModuleListener;
