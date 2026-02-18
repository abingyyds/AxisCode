'use client';

export default function PreviewFrame({ url }: { url: string }) {
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-3 py-1 text-xs text-gray-400 truncate">{url}</div>
      <iframe src={url} className="w-full h-96 bg-white" sandbox="allow-scripts allow-same-origin" />
    </div>
  );
}
