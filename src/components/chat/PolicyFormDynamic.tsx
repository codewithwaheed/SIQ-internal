import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { FieldSchema } from '@/lib/policySchema';

interface DynamicFormProps {
  title?: string;
  subtitle?: string;
  schema: FieldSchema[];
  onSubmit: (answers: Record<string, string>) => void;
  onUseDefaults: () => void;
  disabled?: boolean;
  embedded?: boolean;
}

export const PolicyFormDynamic: React.FC<DynamicFormProps> = ({ title, subtitle, schema, onSubmit, onUseDefaults, disabled, embedded = false }) => {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of schema) {
      if (typeof f.default !== 'undefined' && f.default !== null) {
        init[f.key] = String(f.default);
      }
    }
    return init;
  });

  // When schema changes (e.g., after refresh/hydration), seed defaults if draft is empty or keys changed
  useEffect(() => {
    const keys = schema.map((f) => f.key);
    const draftKeys = Object.keys(draft);
    const keysChanged =
      draftKeys.length === 0 ||
      draftKeys.some((k) => !keys.includes(k)) ||
      keys.some((k) => !(k in draft));
    if (keysChanged) {
      const next: Record<string, string> = {};
      for (const f of schema) {
        if (typeof f.default !== 'undefined' && f.default !== null) {
          next[f.key] = String(f.default);
        }
      }
      setDraft(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  const canSubmit = useMemo(() => Object.keys(draft).length > 0 && !disabled, [draft, disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(draft);
  };

  const setValue = (key: string, value: string | boolean | number) => {
    setDraft((prev) => ({ ...prev, [key]: String(value) }));
  };

  if (embedded) {
    return (
      <div className="space-y-4">
        {(title || subtitle) && (
          <div className="mb-2">
            {title && <h2 className="text-base font-semibold sm:text-lg">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {schema.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.type === 'select' ? (
                <Select
                  value={draft[f.key] ?? ''}
                  onValueChange={(v) => setValue(f.key, v)}
                  disabled={disabled}
                >
                  <SelectTrigger id={f.key}>
                    <SelectValue placeholder={f.placeholder || 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(f.options) ? f.options : []).map((opt) => {
                      const label = typeof opt === 'string' ? opt : opt.label;
                      const value = typeof opt === 'string' ? opt : opt.value;
                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : f.type === 'boolean' ? (
                <div className="flex items-center gap-2 py-2">
                  <Switch
                    id={f.key}
                    checked={(draft[f.key] ?? String(f.default ?? 'false')) === 'true'}
                    onCheckedChange={(v) => setValue(f.key, v)}
                    disabled={disabled}
                  />
                  <span className="text-sm text-muted-foreground">{f.help}</span>
                </div>
              ) : (
                <Input
                  id={f.key}
                  type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || ''}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  disabled={disabled}
                />
              )}
              {f.help && <div className="text-xs text-muted-foreground">{f.help}</div>}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2 max-sm:flex-col">
            <Button type="button" variant="outline" onClick={onUseDefaults} disabled={disabled} className="max-sm:w-full">
              Use best-practice defaults
            </Button>
            <Button type="submit" disabled={!canSubmit} className="max-sm:w-full">
              Continue
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-4 p-4">
        {(title || subtitle) && (
          <div className="mb-2">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {schema.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key}>{f.label}</Label>
              {f.type === 'select' ? (
                <Select
                  value={draft[f.key] ?? ''}
                  onValueChange={(v) => setValue(f.key, v)}
                  disabled={disabled}
                >
                  <SelectTrigger id={f.key}>
                    <SelectValue placeholder={f.placeholder || 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(f.options) ? f.options : []).map((opt) => {
                      const label = typeof opt === 'string' ? opt : opt.label;
                      const value = typeof opt === 'string' ? opt : opt.value;
                      return (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : f.type === 'boolean' ? (
                <div className="flex items-center gap-2 py-2">
                  <Switch
                    id={f.key}
                    checked={(draft[f.key] ?? String(f.default ?? 'false')) === 'true'}
                    onCheckedChange={(v) => setValue(f.key, v)}
                    disabled={disabled}
                  />
                  <span className="text-sm text-muted-foreground">{f.help}</span>
                </div>
              ) : (
                <Input
                  id={f.key}
                  type={f.type === 'number' ? 'number' : 'text'}
                  placeholder={f.placeholder || ''}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setValue(f.key, e.target.value)}
                  disabled={disabled}
                />
              )}
              {f.help && <div className="text-xs text-muted-foreground">{f.help}</div>}
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2 max-sm:flex-col">
            <Button type="button" variant="outline" onClick={onUseDefaults} disabled={disabled} className="max-sm:w-full">
              Use best-practice defaults
            </Button>
            <Button type="submit" disabled={!canSubmit} className="max-sm:w-full">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
