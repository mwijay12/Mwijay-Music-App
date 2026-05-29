
import React, { useRef, useEffect, useMemo } from 'react';

// A lightweight, self-contained WebGL helper
const createWebGLProgram = (gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string) => {
    const createShader = (type: number, src: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexSrc);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSrc);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }

    return program;
};

// GLSL Shaders
const vertexShaderSrc = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSrc = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_blend;
  uniform float u_amplitude;
  uniform float u_speed;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;

  float random (in vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y;
    
    float time = u_time * u_speed * 0.1;
    vec3 color = vec3(0.0);
    
    float n = noise(st * 4.0 + time * 0.5);
    float wave1 = sin(st.y * 10.0 + n * u_amplitude + time * 2.0) * 0.5 + 0.5;
    color = mix(color, u_color1, pow(wave1, u_blend * 3.0));
    
    float n2 = noise(st * 3.0 - time * 0.3);
    float wave2 = sin(st.y * 12.0 + st.x * 2.0 + n2 * u_amplitude * 1.2 - time) * 0.5 + 0.5;
    color = mix(color, u_color2, pow(wave2, u_blend * 3.0));
    
    float n3 = noise(st * 5.0 + time * 0.2);
    float wave3 = cos(st.y * 8.0 - st.x * 3.0 + n3 * u_amplitude * 0.8 + time * 1.5) * 0.5 + 0.5;
    color = mix(color, u_color3, pow(wave3, u_blend * 3.0));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255
    ] : [0, 0, 0];
};

interface AuroraProps {
    position?: 'top' | 'bottom';
    speed?: number;
    blend?: number;
    amplitude?: number;
    color1?: string;
    color2?: string;
    color3?: string;
}

const Aurora: React.FC<AuroraProps> = ({
    position = 'top',
    speed = 0.5,
    blend = 0.5,
    amplitude = 1.0,
    color1,
    color2,
    color3,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const themeColors = useMemo(() => {
        if (typeof window === 'undefined') return { c1: '#C8F052', c2: '#A050FF', c3: '#6955FF' };
        return { c1: '#C8F052', c2: '#A050FF', c3: '#6955FF' };
    }, []);

    const finalColors = useMemo(() => ({
        rgb1: hexToRgb(color1 || themeColors.c1),
        rgb2: hexToRgb(color2 || themeColors.c2),
        rgb3: hexToRgb(color3 || themeColors.c3),
    }), [color1, color2, color3, themeColors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let gl: WebGLRenderingContext | null = null;
        let animationFrameId: number;
        let program: WebGLProgram | null = null;
        let positionBuffer: WebGLBuffer | null = null;

        try {
            gl = canvas.getContext('webgl', { antialias: true, alpha: true });
            
            if (!gl) {
                console.warn("WebGL not supported");
                return;
            }

            program = createWebGLProgram(gl, vertexShaderSrc, fragmentShaderSrc);
            if (!program) return;
            
            gl.useProgram(program);

            const u_resolution = gl.getUniformLocation(program, 'u_resolution');
            const u_time = gl.getUniformLocation(program, 'u_time');
            const u_blend = gl.getUniformLocation(program, 'u_blend');
            const u_amplitude = gl.getUniformLocation(program, 'u_amplitude');
            const u_speed = gl.getUniformLocation(program, 'u_speed');
            const u_color1 = gl.getUniformLocation(program, 'u_color1');
            const u_color2 = gl.getUniformLocation(program, 'u_color2');
            const u_color3 = gl.getUniformLocation(program, 'u_color3');

            positionBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            const positions = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

            const positionAttributeLocation = gl.getAttribLocation(program, "position");
            gl.enableVertexAttribArray(positionAttributeLocation);
            gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

            const startTime = performance.now();
            
            const render = (time: number) => {
                if (!gl) return;
                const elapsedTime = (time - startTime) * 0.001;

                gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
                gl.clear(gl.COLOR_BUFFER_BIT);

                gl.uniform2f(u_resolution, gl.canvas.width, gl.canvas.height);
                gl.uniform1f(u_time, elapsedTime);
                gl.uniform1f(u_blend, blend);
                gl.uniform1f(u_amplitude, amplitude);
                gl.uniform1f(u_speed, speed);
                gl.uniform3fv(u_color1, finalColors.rgb1);
                gl.uniform3fv(u_color2, finalColors.rgb2);
                gl.uniform3fv(u_color3, finalColors.rgb3);

                gl.drawArrays(gl.TRIANGLES, 0, 6);
                animationFrameId = requestAnimationFrame(render);
            };
            
            animationFrameId = requestAnimationFrame(render);

        } catch (e) {
            console.error("WebGL initialization error", e);
        }
        
        const resize = () => {
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', resize);
        resize();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
            if (gl) {
                if (program) gl.deleteProgram(program);
                if (positionBuffer) gl.deleteBuffer(positionBuffer);
            }
        };
    }, [blend, amplitude, speed, finalColors]);

    return (
        <canvas 
            ref={canvasRef} 
            className={`aurora-canvas ${position}`} 
            style={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                zIndex: -1, 
                pointerEvents: 'none' 
            }} 
        />
    );
};

export default Aurora;
