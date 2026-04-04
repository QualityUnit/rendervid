"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import type { FC, ReactNode } from "react";
import { memo } from "react";
import { TbPalette, TbSettings, TbTag } from "react-icons/tb";

interface SettingsLayoutProps {
  children: ReactNode;
}

const ProjectSettingsLayout: FC<SettingsLayoutProps> = ({ children }) => {
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = params.project_id as string;
  const wsParam = searchParams.get("ws");
  const qs = wsParam ? `?ws=${wsParam}` : "";

  const basePath = `/ai-factory/projects/${projectId}`;
  const isSettingsTab = pathname.endsWith("/settings");
  const isTagsTab = pathname.includes("/settings/tags");

  const sidebarItems = [
    {
      label: "General",
      href: `${basePath}/settings${qs}`,
      active: isSettingsTab,
      icon: <TbPalette className="size-4" />,
    },
    {
      label: "Tags",
      href: `${basePath}/settings/tags${qs}`,
      active: isTagsTab,
      icon: <TbTag className="size-4" />,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <nav className="hidden w-52 shrink-0 flex-col gap-1 overflow-y-auto border-r border-gray-200 bg-gray-50/50 p-4 md:flex dark:border-gray-700 dark:bg-gray-900/30">
        <div className="mb-2 flex items-center gap-2 px-3 py-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
          <TbSettings className="size-4" />
          Settings
        </div>
        {sidebarItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              item.active
                ? "bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                : "text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto">
        <div className="w-full max-w-4xl">{children}</div>
      </div>
    </div>
  );
};

export default memo(ProjectSettingsLayout);
