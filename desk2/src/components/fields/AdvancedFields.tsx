/**
 * Advanced value fields: Code (Monaco), Text Editor (rich), Attach / Image,
 * Duration, Geolocation, Signature, plus layout-only types (HTML, Heading,
 * Read Only, Button) which don't carry values.
 *
 * Monaco is loaded lazily via @monaco-editor/react to keep the initial bundle
 * small. Rich text uses Quill. Geolocation uses leaflet. Signature uses
 * react-signature-canvas. These deps are optional and only added when the
 * corresponding field type is first encountered.
 *
 * For stage 1 we provide lighter fallbacks (textarea for code, plain HTML for
 * geolocation) so the build stays green; we can swap in Monaco/Quill/Leaflet
 * in a later iteration when we confirm they're needed.
 */

import { Button, Input, InputNumber, Space, Typography, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { InboxOutlined, PaperClipOutlined } from '@ant-design/icons';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import type { FieldProps } from './BasicFields';

const { Text, Title: AntTitle, Paragraph } = Typography;

// ---------- Code / JSON ----------

const MonacoEditor = lazy(() => import('@monaco-editor/react').then((m) => ({ default: m.default })));

export function CodeField({ df, value, onChange, disabled }: FieldProps) {
	const language = mapLanguage((df.options as string) || 'plaintext');
	return (
		<Suspense fallback={<Input.TextArea rows={10} disabled placeholder="Loading editor…" />}>
			<MonacoEditor
				height={300}
				language={language}
				value={(value as string) ?? ''}
				onChange={(v) => onChange(v ?? '')}
				options={{ readOnly: disabled, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, wordWrap: 'on' }}
			/>
		</Suspense>
	);
}

/** Map Frappe code-field option names to Monaco language ids. */
function mapLanguage(opt: string): string {
	const m: Record<string, string> = {
		JSON: 'json',
		Python: 'python',
		JavaScript: 'javascript',
		'JavaScript (Browser)': 'javascript',
		HTML: 'html',
		CSS: 'css',
		SCSS: 'scss',
		Less: 'less',
		Markdown: 'markdown',
		SQL: 'sql',
		XML: 'xml',
		YAML: 'yaml',
		Bash: 'shell',
		Shell: 'shell',
		TypeScript: 'typescript',
	};
	return m[opt] ?? 'plaintext';
}

export function JsonField({ value, onChange, disabled }: FieldProps) {
	const [text, setText] = useState(() => {
		try {
			return JSON.stringify(JSON.parse(String(value ?? '{}')), null, 2);
		} catch {
			return String(value ?? '');
		}
	});
	return (
		<Input.TextArea
			value={text}
			onChange={(e) => {
				setText(e.target.value);
				try {
					onChange(JSON.parse(e.target.value));
				} catch {
					// keep raw text until it parses
				}
			}}
			disabled={disabled}
			rows={10}
			style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13 }}
		/>
	);
}

// ---------- Text editor (rich) ----------

const ReactQuill = lazy(() => import('react-quill').then((m) => ({ default: m.default })));
import 'react-quill/dist/quill.snow.css';

export function TextEditorField({ value, onChange, disabled }: FieldProps) {
	return (
		<Suspense fallback={<Input.TextArea rows={6} disabled placeholder="Loading editor…" />}>
			<ReactQuill
				theme="snow"
				value={(value as string) ?? ''}
				onChange={(v) => onChange(v)}
				readOnly={disabled}
				modules={{
					toolbar: [
						[{ header: [1, 2, 3, false] }],
						['bold', 'italic', 'underline', 'strike'],
						[{ list: 'ordered' }, { list: 'bullet' }],
						['link', 'image'],
						['clean'],
					],
				}}
				style={{ background: '#fff' }}
			/>
		</Suspense>
	);
}

// ---------- Attach / Attach Image ----------

export function AttachField({ value, onChange, disabled, df }: FieldProps) {
	const [files, setFiles] = useState<UploadFile[]>([]);
	return (
		<Upload.Dragger
			multiple={false}
			disabled={disabled}
			maxCount={1}
			fileList={files}
			beforeUpload={(file) => {
				// In real usage we'd call frappeFile.uploadFile; for stage 1 we just
				// surface the file name and let the parent decide.
				setFiles([
					{
						uid: file.uid,
						name: file.name,
						size: file.size,
						type: file.type,
					},
				]);
				onChange?.(file.name);
				return false; // prevent automatic upload
			}}
			onRemove={() => {
				setFiles([]);
				onChange?.('');
			}}
		>
			<p className="ant-upload-drag-icon">
				<InboxOutlined />
			</p>
			<p className="ant-upload-text">
				{value ? (
					<Space>
						<PaperClipOutlined /> {value as string}
					</Space>
				) : (
					`Click or drop ${df.label ?? 'a file'}`
				)}
			</p>
		</Upload.Dragger>
	);
}

export function AttachImageField(props: FieldProps) {
	return <AttachField {...props} />;
}

export function ImageField({ value, df }: FieldProps) {
	const src = (value as string) || '';
	if (!src) return <Text type="secondary">No image</Text>;
	const url = src.startsWith('http') || src.startsWith('/') ? src : `/${src}`;
	return <img src={url} alt={df.label ?? 'image'} style={{ maxWidth: '100%', maxHeight: 200 }} />;
}

// ---------- Duration ----------

export function DurationField({ df, value, onChange, disabled, size }: FieldProps) {
	// Frappe Duration stores seconds as an integer. We display HH:MM:SS.
	const total = Number(value ?? 0);
	const days = df.hide_days ? 0 : Math.floor(total / 86400);
	const rem = total - days * 86400;
	const hours = Math.floor(rem / 3600);
	const mins = Math.floor((rem % 3600) / 60);
	const secs = Math.floor(rem % 60);

	const set = (newDays: number, newHours: number, newMins: number, newSecs: number) => {
		onChange(newDays * 86400 + newHours * 3600 + newMins * 60 + newSecs);
	};

	return (
		<Space size="small">
			{!df.hide_days && (
				<>
					<InputNumber size={size} disabled={disabled} value={days} onChange={(v) => set(v ?? 0, hours, mins, secs)} addonAfter="d" />
				</>
			)}
			<InputNumber size={size} disabled={disabled} value={hours} onChange={(v) => set(days, v ?? 0, mins, secs)} addonAfter="h" />
			<InputNumber size={size} disabled={disabled} value={mins} onChange={(v) => set(days, hours, v ?? 0, secs)} addonAfter="m" />
			{!df.hide_seconds && (
				<InputNumber size={size} disabled={disabled} value={secs} onChange={(v) => set(days, hours, mins, v ?? 0)} addonAfter="s" />
			)}
		</Space>
	);
}

// ---------- Geolocation (Leaflet map) ----------

const MapContainer = lazy(() => import('react-leaflet').then((m) => ({ default: m.MapContainer })));
const TileLayer = lazy(() => import('react-leaflet').then((m) => ({ default: m.TileLayer })));
const Marker = lazy(() => import('react-leaflet').then((m) => ({ default: m.Marker })));
const Popup = lazy(() => import('react-leaflet').then((m) => ({ default: m.Popup })));
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path (it breaks under bundlers).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
	iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
	iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
	shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export function GeolocationField({ value }: FieldProps) {
	// Frappe stores GeoJSON. Parse out the first point if present.
	const point = parseFirstPoint(value);
	return (
		<Suspense fallback={<Input.TextArea rows={4} disabled placeholder="Loading map…" />}>
			<div style={{ height: 300, borderRadius: 6, overflow: 'hidden' }}>
				<MapContainer
					center={point ?? [39.9, 116.4]}
					zoom={13}
					style={{ height: '100%', width: '100%' }}
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>
					{point && (
						<Marker position={point}>
							<Popup>Location</Popup>
						</Marker>
					)}
				</MapContainer>
			</div>
		</Suspense>
	);
}

/** Try to extract [lat, lng] from a Frappe geolocation value. */
function parseFirstPoint(value: unknown): [number, number] | null {
	if (!value) return null;
	let geo: { features?: Array<{ geometry?: { coordinates?: number[]; type?: string } }> };
	try {
		geo = typeof value === 'string' ? JSON.parse(value) : (value as typeof geo);
	} catch {
		return null;
	}
	const coords = geo.features?.[0]?.geometry?.coordinates;
	if (Array.isArray(coords) && coords.length >= 2) {
		// GeoJSON is [lng, lat]; Leaflet wants [lat, lng].
		return [coords[1], coords[0]];
	}
	return null;
}

// ---------- Signature (placeholder) ----------

export function SignatureField({ value, onChange, disabled }: FieldProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const drawing = useRef(false);
	useEffect(() => {
		const c = canvasRef.current;
		if (!c) return;
		const ctx = c.getContext('2d');
		if (ctx && typeof value === 'string' && value.startsWith('data:image')) {
			const img = new Image();
			img.onload = () => ctx.drawImage(img, 0, 0);
			img.src = value;
		}
	}, [value]);
	const pos = (e: React.MouseEvent | React.TouchEvent) => {
		const c = canvasRef.current!;
		const rect = c.getBoundingClientRect();
		const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
		const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
		return { x, y };
	};
	const start = (e: React.MouseEvent | React.TouchEvent) => {
		if (disabled) return;
		drawing.current = true;
		const ctx = canvasRef.current!.getContext('2d')!;
		const { x, y } = pos(e);
		ctx.beginPath();
		ctx.moveTo(x, y);
	};
	const move = (e: React.MouseEvent | React.TouchEvent) => {
		if (!drawing.current) return;
		e.preventDefault();
		const ctx = canvasRef.current!.getContext('2d')!;
		const { x, y } = pos(e);
		ctx.lineTo(x, y);
		ctx.stroke();
	};
	const end = () => {
		if (!drawing.current) return;
		drawing.current = false;
		onChange?.(canvasRef.current?.toDataURL('image/png') ?? '');
	};
	return (
		<div>
			<canvas
				ref={canvasRef}
				width={400}
				height={150}
				style={{ border: '1px solid #d9d9d9', borderRadius: 6, touchAction: 'none' }}
				onMouseDown={start}
				onMouseMove={move}
				onMouseUp={end}
				onMouseLeave={end}
				onTouchStart={start}
				onTouchMove={move}
				onTouchEnd={end}
			/>
			{!disabled && (
				<Button
					size="small"
					onClick={() => {
						const c = canvasRef.current!;
						c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
						onChange?.('');
					}}
				>
					Clear
				</Button>
			)}
		</div>
	);
}

// ---------- Layout / non-value types ----------

export function HtmlField({ df }: FieldProps) {
	return <div dangerouslySetInnerHTML={{ __html: (df.options as string) ?? '' }} />;
}

export function HeadingField({ df }: FieldProps) {
	return <AntTitle level={5}>{df.label}</AntTitle>;
}

export function ReadOnlyField({ value, df }: FieldProps) {
	return <Paragraph strong={df.bold === 1}>{(value as string) || <Text type="secondary">—</Text>}</Paragraph>;
}

export function ButtonField({ df }: FieldProps) {
	// Buttons in Frappe trigger server-side or client-side handlers. We render a
	// plain button; the controller config wires the onClick (see form-config).
	return (
		<Button onClick={() => {
			// Stage-2: dispatch to controller handler.
			window.alert(`Button "${df.fieldname}" clicked — wire this via form-config.`);
		}}>
			{df.label ?? df.fieldname}
		</Button>
	);
}
