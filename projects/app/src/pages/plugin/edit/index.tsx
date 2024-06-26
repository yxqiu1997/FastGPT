import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Header from './Header';
import Flow from '@/components/core/workflow/Flow';
import FlowProvider, { useFlowProviderStore } from '@/components/core/workflow/Flow/FlowProvider';
import { pluginSystemModuleTemplates } from '@fastgpt/global/core/workflow/template/constants';
import { serviceSideProps } from '@/web/common/utils/i18n';
import { useQuery } from '@tanstack/react-query';
import { getOnePlugin } from '@/web/core/plugin/api';
import { useToast } from '@fastgpt/web/hooks/useToast';
import Loading from '@fastgpt/web/components/common/MyLoading';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useTranslation } from 'next-i18next';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import { v1Workflow2V2 } from '@/web/core/workflow/adapt';

type Props = { pluginId: string };

const Render = ({ pluginId }: Props) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { initData } = useFlowProviderStore();

  const { data: pluginDetail } = useQuery(
    ['getOnePlugin', pluginId],
    () => getOnePlugin(pluginId),
    {
      onError: (error) => {
        toast({
          status: 'warning',
          title: getErrText(error, t('plugin.Load Plugin Failed'))
        });
        router.replace('/plugin/list');
      }
    }
  );
  const isV2Workflow = pluginDetail?.version === 'v2';
  const { openConfirm, ConfirmModal } = useConfirm({
    showCancel: false,
    content:
      '检测到您的高级编排为旧版，系统将为您自动格式化成新版工作流。\n\n由于版本差异较大，会导致许多工作流无法正常排布，请重新手动连接工作流。如仍异常，可尝试删除对应节点后重新添加。\n\n你可以直接点击测试进行调试，无需点击保存，点击保存为新版工作流。'
  });

  useEffect(() => {
    if (isV2Workflow) {
      initData(
        JSON.parse(
          JSON.stringify({
            nodes: pluginDetail?.modules || [],
            edges: pluginDetail?.edges || []
          })
        )
      );
    }
  }, [isV2Workflow, pluginDetail?.edges, pluginDetail?.modules]);

  useEffect(() => {
    if (!isV2Workflow && pluginDetail) {
      openConfirm(() => {
        initData(JSON.parse(JSON.stringify(v1Workflow2V2((pluginDetail.modules || []) as any))));
      })();
    }
  }, [isV2Workflow, openConfirm, pluginDetail]);

  return pluginDetail ? (
    <>
      <Flow Header={<Header plugin={pluginDetail} onClose={() => router.back()} />} />
      {!isV2Workflow && <ConfirmModal countDown={0} />}
    </>
  ) : (
    <Loading />
  );
};

export default function FlowEdit(props: any) {
  return (
    <FlowProvider mode={'plugin'} basicNodeTemplates={pluginSystemModuleTemplates}>
      <Render {...props} />
    </FlowProvider>
  );
}

export async function getServerSideProps(context: any) {
  return {
    props: {
      pluginId: context?.query?.pluginId || '',
      ...(await serviceSideProps(context))
    }
  };
}
