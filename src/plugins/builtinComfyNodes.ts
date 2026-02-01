import type { Plugin, ComfyUINodeDefinition } from '../types';

/**
 * ComfyUI 核心节点定义
 */
const coreNodes: ComfyUINodeDefinition[] = [
  // 加载器
  {
    name: 'CheckpointLoaderSimple',
    display_name: '模型加载器',
    category: 'loaders',
    input: {
      required: {
        ckpt_name: [['v1-5-pruned.safetensors', 'sd_xl_base_1.0.safetensors', 'flux1-dev.safetensors']],
      },
    },
    output: ['MODEL', 'CLIP', 'VAE'],
    output_name: ['模型', 'CLIP', 'VAE'],
    description: '加载 Stable Diffusion 检查点模型',
  },
  {
    name: 'VAELoader',
    display_name: 'VAE 加载器',
    category: 'loaders',
    input: {
      required: {
        vae_name: [['vae-ft-mse-840000-ema-pruned.safetensors', 'sdxl_vae.safetensors']],
      },
    },
    output: ['VAE'],
    output_name: ['VAE'],
    description: '加载 VAE 模型',
  },
  {
    name: 'LoraLoader',
    display_name: 'LoRA 加载器',
    category: 'loaders',
    input: {
      required: {
        model: ['MODEL'],
        clip: ['CLIP'],
        lora_name: [['lora1.safetensors', 'lora2.safetensors']],
        strength_model: ['FLOAT', { default: 1.0, min: -10.0, max: 10.0, step: 0.01 }],
        strength_clip: ['FLOAT', { default: 1.0, min: -10.0, max: 10.0, step: 0.01 }],
      },
    },
    output: ['MODEL', 'CLIP'],
    output_name: ['模型', 'CLIP'],
    description: '加载 LoRA 模型并应用到基础模型',
  },
  
  // 采样器
  {
    name: 'KSampler',
    display_name: 'K采样器',
    category: 'sampling',
    input: {
      required: {
        model: ['MODEL'],
        seed: ['INT', { default: 0, min: 0, max: 0xffffffffffffffff }],
        steps: ['INT', { default: 20, min: 1, max: 10000 }],
        cfg: ['FLOAT', { default: 7.0, min: 0.0, max: 100.0, step: 0.1 }],
        sampler_name: [['euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpm_2_ancestral', 'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde', 'dpmpp_2m', 'dpmpp_2m_sde', 'ddim', 'uni_pc']],
        scheduler: [['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform']],
        positive: ['CONDITIONING'],
        negative: ['CONDITIONING'],
        latent_image: ['LATENT'],
        denoise: ['FLOAT', { default: 1.0, min: 0.0, max: 1.0, step: 0.01 }],
      },
    },
    output: ['LATENT'],
    output_name: ['潜空间'],
    description: 'K采样器，用于生成图像',
  },
  {
    name: 'KSamplerAdvanced',
    display_name: 'K采样器(高级)',
    category: 'sampling',
    input: {
      required: {
        model: ['MODEL'],
        add_noise: [['enable', 'disable']],
        noise_seed: ['INT', { default: 0, min: 0, max: 0xffffffffffffffff }],
        steps: ['INT', { default: 20, min: 1, max: 10000 }],
        cfg: ['FLOAT', { default: 8.0, min: 0.0, max: 100.0 }],
        sampler_name: [['euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpmpp_2m', 'ddim']],
        scheduler: [['normal', 'karras', 'exponential', 'simple']],
        positive: ['CONDITIONING'],
        negative: ['CONDITIONING'],
        latent_image: ['LATENT'],
        start_at_step: ['INT', { default: 0, min: 0, max: 10000 }],
        end_at_step: ['INT', { default: 10000, min: 0, max: 10000 }],
        return_with_leftover_noise: [['disable', 'enable']],
      },
    },
    output: ['LATENT'],
    output_name: ['潜空间'],
    description: '高级K采样器，提供更多控制选项',
  },
  
  // 条件
  {
    name: 'CLIPTextEncode',
    display_name: 'CLIP文本编码',
    category: 'conditioning',
    input: {
      required: {
        text: ['STRING', { multiline: true, default: '' }],
        clip: ['CLIP'],
      },
    },
    output: ['CONDITIONING'],
    output_name: ['条件'],
    description: '将文本编码为 CLIP 条件',
  },
  {
    name: 'ConditioningCombine',
    display_name: '条件合并',
    category: 'conditioning',
    input: {
      required: {
        conditioning_1: ['CONDITIONING'],
        conditioning_2: ['CONDITIONING'],
      },
    },
    output: ['CONDITIONING'],
    output_name: ['条件'],
    description: '合并两个条件',
  },
  {
    name: 'ConditioningSetArea',
    display_name: '条件区域设置',
    category: 'conditioning',
    input: {
      required: {
        conditioning: ['CONDITIONING'],
        width: ['INT', { default: 64, min: 64, max: 4096, step: 8 }],
        height: ['INT', { default: 64, min: 64, max: 4096, step: 8 }],
        x: ['INT', { default: 0, min: 0, max: 4096, step: 8 }],
        y: ['INT', { default: 0, min: 0, max: 4096, step: 8 }],
        strength: ['FLOAT', { default: 1.0, min: 0.0, max: 10.0, step: 0.01 }],
      },
    },
    output: ['CONDITIONING'],
    output_name: ['条件'],
    description: '设置条件的作用区域',
  },
  
  // 潜空间
  {
    name: 'EmptyLatentImage',
    display_name: '空潜空间图像',
    category: 'latent',
    input: {
      required: {
        width: ['INT', { default: 512, min: 16, max: 8192, step: 8 }],
        height: ['INT', { default: 512, min: 16, max: 8192, step: 8 }],
        batch_size: ['INT', { default: 1, min: 1, max: 64 }],
      },
    },
    output: ['LATENT'],
    output_name: ['潜空间'],
    description: '创建空的潜空间图像',
  },
  {
    name: 'LatentUpscale',
    display_name: '潜空间放大',
    category: 'latent',
    input: {
      required: {
        samples: ['LATENT'],
        upscale_method: [['nearest-exact', 'bilinear', 'area', 'bicubic', 'bislerp']],
        width: ['INT', { default: 512, min: 0, max: 8192, step: 8 }],
        height: ['INT', { default: 512, min: 0, max: 8192, step: 8 }],
        crop: [['disabled', 'center']],
      },
    },
    output: ['LATENT'],
    output_name: ['潜空间'],
    description: '放大潜空间图像',
  },
  
  // 图像
  {
    name: 'VAEDecode',
    display_name: 'VAE解码',
    category: 'image',
    input: {
      required: {
        samples: ['LATENT'],
        vae: ['VAE'],
      },
    },
    output: ['IMAGE'],
    output_name: ['图像'],
    description: '将潜空间解码为图像',
  },
  {
    name: 'VAEEncode',
    display_name: 'VAE编码',
    category: 'image',
    input: {
      required: {
        pixels: ['IMAGE'],
        vae: ['VAE'],
      },
    },
    output: ['LATENT'],
    output_name: ['潜空间'],
    description: '将图像编码为潜空间',
  },
  {
    name: 'LoadImage',
    display_name: '加载图像',
    category: 'image',
    input: {
      required: {
        image: [['image1.png', 'image2.png']],
      },
    },
    output: ['IMAGE', 'MASK'],
    output_name: ['图像', '蒙版'],
    description: '从文件加载图像',
  },
  {
    name: 'SaveImage',
    display_name: '保存图像',
    category: 'image',
    input: {
      required: {
        images: ['IMAGE'],
        filename_prefix: ['STRING', { default: 'ComfyUI' }],
      },
    },
    output: [],
    description: '保存图像到文件',
  },
  {
    name: 'PreviewImage',
    display_name: '预览图像',
    category: 'image',
    input: {
      required: {
        images: ['IMAGE'],
      },
    },
    output: [],
    description: '预览图像',
  },
  {
    name: 'ImageScale',
    display_name: '图像缩放',
    category: 'image',
    input: {
      required: {
        image: ['IMAGE'],
        upscale_method: [['nearest-exact', 'bilinear', 'area', 'bicubic', 'lanczos']],
        width: ['INT', { default: 512, min: 0, max: 8192, step: 1 }],
        height: ['INT', { default: 512, min: 0, max: 8192, step: 1 }],
        crop: [['disabled', 'center']],
      },
    },
    output: ['IMAGE'],
    output_name: ['图像'],
    description: '缩放图像',
  },
  {
    name: 'ImageInvert',
    display_name: '图像反转',
    category: 'image',
    input: {
      required: {
        image: ['IMAGE'],
      },
    },
    output: ['IMAGE'],
    output_name: ['图像'],
    description: '反转图像颜色',
  },
  
  // 蒙版
  {
    name: 'MaskToImage',
    display_name: '蒙版转图像',
    category: 'mask',
    input: {
      required: {
        mask: ['MASK'],
      },
    },
    output: ['IMAGE'],
    output_name: ['图像'],
    description: '将蒙版转换为图像',
  },
  {
    name: 'ImageToMask',
    display_name: '图像转蒙版',
    category: 'mask',
    input: {
      required: {
        image: ['IMAGE'],
        channel: [['red', 'green', 'blue', 'alpha']],
      },
    },
    output: ['MASK'],
    output_name: ['蒙版'],
    description: '将图像转换为蒙版',
  },
];

/**
 * ControlNet 预处理器节点
 */
const controlNetNodes: ComfyUINodeDefinition[] = [
  {
    name: 'ControlNetLoader',
    display_name: 'ControlNet加载器',
    category: 'controlnet',
    input: {
      required: {
        control_net_name: [['control_v11p_sd15_canny.pth', 'control_v11p_sd15_openpose.pth', 'control_v11f1p_sd15_depth.pth']],
      },
    },
    output: ['CONTROL_NET'],
    output_name: ['ControlNet'],
    description: '加载 ControlNet 模型',
  },
  {
    name: 'ControlNetApply',
    display_name: 'ControlNet应用',
    category: 'controlnet',
    input: {
      required: {
        conditioning: ['CONDITIONING'],
        control_net: ['CONTROL_NET'],
        image: ['IMAGE'],
        strength: ['FLOAT', { default: 1.0, min: 0.0, max: 10.0, step: 0.01 }],
      },
    },
    output: ['CONDITIONING'],
    output_name: ['条件'],
    description: '应用 ControlNet 到条件',
  },
  {
    name: 'CannyEdgePreprocessor',
    display_name: 'Canny边缘检测',
    category: 'controlnet',
    input: {
      required: {
        image: ['IMAGE'],
        low_threshold: ['INT', { default: 100, min: 0, max: 255 }],
        high_threshold: ['INT', { default: 200, min: 0, max: 255 }],
      },
    },
    output: ['IMAGE'],
    output_name: ['图像'],
    description: 'Canny 边缘检测预处理',
  },
  {
    name: 'DepthAnythingPreprocessor',
    display_name: '深度估计',
    category: 'controlnet',
    input: {
      required: {
        image: ['IMAGE'],
      },
    },
    output: ['IMAGE'],
    output_name: ['深度图'],
    description: '深度估计预处理',
  },
  {
    name: 'OpenposePreprocessor',
    display_name: 'OpenPose检测',
    category: 'controlnet',
    input: {
      required: {
        image: ['IMAGE'],
        detect_hand: [['enable', 'disable']],
        detect_body: [['enable', 'disable']],
        detect_face: [['enable', 'disable']],
      },
    },
    output: ['IMAGE'],
    output_name: ['姿态图'],
    description: 'OpenPose 姿态检测',
  },
];

/**
 * IP-Adapter 节点
 */
const ipAdapterNodes: ComfyUINodeDefinition[] = [
  {
    name: 'IPAdapterModelLoader',
    display_name: 'IP-Adapter模型加载器',
    category: 'ipadapter',
    input: {
      required: {
        ipadapter_file: [['ip-adapter_sd15.safetensors', 'ip-adapter-plus_sd15.safetensors', 'ip-adapter_sdxl.safetensors']],
      },
    },
    output: ['IPADAPTER'],
    output_name: ['IP-Adapter'],
    description: '加载 IP-Adapter 模型',
  },
  {
    name: 'IPAdapterApply',
    display_name: 'IP-Adapter应用',
    category: 'ipadapter',
    input: {
      required: {
        model: ['MODEL'],
        ipadapter: ['IPADAPTER'],
        image: ['IMAGE'],
        weight: ['FLOAT', { default: 1.0, min: -1.0, max: 3.0, step: 0.05 }],
        start_at: ['FLOAT', { default: 0.0, min: 0.0, max: 1.0, step: 0.01 }],
        end_at: ['FLOAT', { default: 1.0, min: 0.0, max: 1.0, step: 0.01 }],
      },
    },
    output: ['MODEL'],
    output_name: ['模型'],
    description: '应用 IP-Adapter 到模型',
  },
  {
    name: 'IPAdapterFaceID',
    display_name: 'IP-Adapter FaceID',
    category: 'ipadapter',
    input: {
      required: {
        model: ['MODEL'],
        ipadapter: ['IPADAPTER'],
        image: ['IMAGE'],
        weight: ['FLOAT', { default: 0.85, min: -1.0, max: 3.0, step: 0.05 }],
        weight_faceidv2: ['FLOAT', { default: 1.0, min: -1.0, max: 3.0, step: 0.05 }],
        combine_embeds: [['concat', 'add', 'subtract', 'average', 'norm average']],
      },
    },
    output: ['MODEL'],
    output_name: ['模型'],
    description: 'IP-Adapter FaceID 人脸一致性',
  },
];

/**
 * ComfyUI 核心插件
 */
export const comfyCorePlugin: Plugin = {
  id: 'comfy-core',
  name: 'ComfyUI 核心节点',
  version: '1.0.0',
  description: 'ComfyUI 核心节点集合',
  author: 'ComfyUI',
  enabled: true,
  nodes: coreNodes,
};

/**
 * ControlNet 预处理器插件
 */
export const controlNetPlugin: Plugin = {
  id: 'controlnet-preprocessors',
  name: 'ControlNet 预处理器',
  version: '1.0.0',
  description: 'ControlNet 预处理器节点',
  author: 'ComfyUI',
  enabled: true,
  nodes: controlNetNodes,
};

/**
 * IP-Adapter 插件
 */
export const ipAdapterPlugin: Plugin = {
  id: 'ipadapter',
  name: 'IP-Adapter',
  version: '1.0.0',
  description: 'IP-Adapter 节点，用于图像提示和人脸一致性',
  author: 'cubiq',
  enabled: true,
  nodes: ipAdapterNodes,
};

/**
 * 所有内置插件
 */
export const builtinPlugins: Plugin[] = [
  comfyCorePlugin,
  controlNetPlugin,
  ipAdapterPlugin,
];
