import LoadingTableSkeleton from "@/components/elements/LoadingTableSkeleton";
import FullscreenWrapper from "@/components/layout/FullscreenWrapper";
import PageTitle from "@/components/layout/PageTitle";
import { Button } from "flowbite-react";
import { TbPlus } from "react-icons/tb";

export default function Loading() {
  return (
    <FullscreenWrapper>
      <div className="flex items-center justify-between">
        <PageTitle>Agent Teams</PageTitle>
        <Button color="primary" size="sm">
          <TbPlus className="mr-2 size-3" />
          Create Team
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <LoadingTableSkeleton />
      </div>
    </FullscreenWrapper>
  );
}
