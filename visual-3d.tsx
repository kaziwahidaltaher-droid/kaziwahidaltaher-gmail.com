/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, html, css, PropertyValueMap, nothing} from 'lit';
import {unsafeHTML} from 'lit/directives/unsafe-html.js';
import {customElement, property, state, query} from 'lit/decorators.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {PlanetData, GalaxyData, GroundingChunk} from './index.js';
import {
  vs as atmosphereVs,
  fs as atmosphereFs,
} from './atmosphere-shader.js';
import {vs as planetVs, fs as planetFs} from './planet-shader.js';
import {vs as starfieldVs, fs as starfieldFs} from './starfield-shaders.js';
import {vs as galaxyVs, fs as galaxyFs} from './galaxy-point-shaders.js';
import {GoogleGenAI} from '@google/genai';

// Data provided by the user for the Structural Integrity Analysis feature.
const STRUCTURE_DATA = `
----------------------------------------
-- Basic definition of nodes and beams for
-- reduced model of Hirenasd-wing including
-- clamping area, balance and excitation 
-- mechanism.

-------------------------------------------
-- Young and shear modulus in wing for T=177.375K
-- E_Mod_Ref = 1.8611E11

-- Out-of wind components modeled for 293K

-------------------------------------------
-- Naming: Nodes and elements with 'balance' in name
--         are combining all units not exposed in the 
--         windtunnel

Node => Balance Node 1; 0.25234·m; 0·m; -0.84000·m;
-- ^^ Boundary conditions: clamped
Node => Balance Node 2; 0.25234·m; 0·m; -0.80000·m;
Node => Balance Node 3; 0.25234·m; 0·m; -0.70400·m;
Node => Balance Node 4; 0.25234·m; 0·m; -0.67200·m;
Node => Balance Node 5; 0.25234·m; 0·m; -0.62200·m;
Node => Balance Node 6; 0.25234·m; 0·m; -0.59600·m;
Node => Balance Node 7; 0.25234·m; 0·m; -0.55200·m;
Node => Balance Node 8; 0.25234·m; 0·m; -0.51600·m;
Node => Balance Node 9; 0.25234·m; 0·m; -0.49300·m;
Node => Balance Node 10; 0.25234·m; 0·m; -0.39500·m;
Node => Balance Node 11; 0.25234·m; 0·m; -0.34500·m;
Node => Balance Node 12; 0.25234·m; 0·m; -0.33800·m;
Node => Balance Node 14; 0.25234·m; 0·m; -0.31500·m;
Node => Balance Node 15; 0.25234·m; 0·m; -0.25500·m;
Node => Balance Node 16; 0.25234·m; 0·m; -0.22500·m;
Node => Balance Node 17; 0.25234·m; 0·m; -0.16800·m;
Node => Balance Node 18; 0.25234·m; 0·m; -0.12600·m;
Node => Balance Node 19; 0.25234·m; 0·m; -0.084000·m;
Node => Balance Node 20; 0.25234·m; 0·m; -0.042000·m;

Node => Balance Node 21; 0.25234·m; 0·m; 0·m;
-- ^^ possible outer loading point for excitation mechanism
Node => Balance B Node 21; 0.26014·m; -0.0019003·m; 0·m;
Node => Balance C Node 21; 0.22683·m; -0.0019021·m; 0·m;

Node => Wing Node 1; 0.27394·m; 0·m; 0.052582·m;
Node => B Node 1; 0.28178·m; -0.00052602·m; 0.049364·m;

Node => Wing Node 2; 0.29513·m; 0·m; 0.10417·m;
Node => B Node 2; 0.31086·m; 0.00071382·m; 0.097707·m;
Node => C Node 2; 0.32667·m; 0.00080760·m; 0.091215·m;
Node => D Node 2; 0.30047·m; 0.00091925·m; 0.10198·m;

Node => Wing Node 3; 0.31591·m; 0·m; 0.15476·m;
Node => B Node 3; 0.33410·m; 0.0017307·m; 0.14729·m;
Node => C Node 3; 0.34343·m; 0.0017147·m; 0.14346·m;
Node => D Node 3; 0.32245·m; 0.0018564·m; 0.15208·m;

Node => Wing Node 4; 0.33629·m; 0·m; 0.20436·m;
Node => BC Node 4; 0.35584·m; 0.0026841·m; 0.19632·m;
Node => D Node 4; 0.34288·m; 0.0027776·m; 0.20165·m;

Node => Wing Node 5; 0.35625·m; 0·m; 0.25296·m;
Node => BC Node 5; 0.37618·m; 0.0035124·m; 0.24477·m;
Node => D Node 5; 0.36149·m; 0.0034919·m; 0.25081·m;

Node => Wing Node 6; 0.37838·m; 0·m; 0.30057·m;
Node => BC Node 6; 0.39659·m; 0.0038769·m; 0.29043·m;

Node => Wing Node 7; 0.40432·m; 0·m; 0.34718·m;
Node => BC Node 7; 0.41427·m; 0.0038254·m; 0.34164·m;

Node => Wing Node 8; 0.42971·m; 0·m; 0.39279·m;
Node => BC Node 8; 0.43646·m; 0.0036945·m; 0.38904·m;
Node => D Node 8; 0.42519·m; 0.0036803·m; 0.39530·m;

Node => Wing Node 9; 0.45454·m; 0·m; 0.43741·m;
Node => BC Node 9; 0.46029·m; 0.0035432·m; 0.43421·m;
Node => D Node 9; 0.44726·m; 0.0035445·m; 0.44147·m;

Node => Wing Node 10; 0.47882·m; 0·m; 0.48104·m;
Node => BC Node 10; 0.48410·m; 0.0034008·m; 0.47810·m;
Node => D Node 10; 0.47033·m; 0.0033959·m; 0.48576·m;

Node => Wing Node 11; 0.50255·m; 0·m; 0.52367·m;
Node => BC Node 11; 0.50707·m; 0.0032663·m; 0.52115·m;
Node => D Node 11; 0.49375·m; 0.0032524·m; 0.52856·m;

Node => Wing Node 12; 0.52572·m; 0·m; 0.56530·m;
Node => BC Node 12; 0.52975·m; 0.0031224·m; 0.56306·m;
Node => D Node 12; 0.51674·m; 0.0031109·m; 0.57030·m;

Node => Wing Node 13; 0.55167·m; 0.0029846·m; 0.60409·m;
Node => D Node 13; 0.53927·m; 0.0029728·m; 0.61099·m;

Node => Wing Node 14; 0.57308·m; 0.0028587·m; 0.64409·m;
Node => D Node 14; 0.56131·m; 0.0028393·m; 0.65064·m;

Node => Wing Node 15; 0.59388·m; 0.0027557·m; 0.68314·m;
Node => D Node 15; 0.58283·m; 0.0027116·m; 0.68929·m;

Node => Wing Node 16; 0.61547·m; 0.0027438·m; 0.72044·m;
Node => D Node 16; 0.60380·m; 0.0025898·m; 0.72693·m;

Node => Wing Node 17; 0.63553·m; 0.0026976·m; 0.75729·m;
Node => D Node 17; 0.62422·m; 0.0024721·m; 0.76358·m;

Node => Wing Node 18; 0.65438·m; 0.0025590·m; 0.79351·m;
Node => D Node 18; 0.64410·m; 0.0023585·m; 0.79923·m;

Node => Wing Node 19; 0.67296·m; 0.0022996·m; 0.82857·m;
Node => D Node 19; 0.66347·m; 0.0022498·m; 0.83385·m;

Node => Wing Node 20; 0.69175·m; 0.0021310·m; 0.86221·m;
Node => D Node 20; 0.68233·m; 0.0021467·m; 0.86746·m;

Node => Wing Node 21; 0.71099·m; 0.0020644·m; 0.89431·m;
Node => D Node 21; 0.70073·m; 0.0020508·m; 0.90002·m;

Node => Wing Node 22; 0.72950·m; 0.0019943·m; 0.92550·m;
Node => D Node 22; 0.71872·m; 0.0019645·m; 0.93150·m;

Node => Wing Node 23; 0.74660·m; 0.0019465·m; 0.95617·m;
Node => D Node 23; 0.73628·m; 0.0018875·m; 0.96192·m;

Node => Wing Node 24; 0.76350·m; 0.0018858·m; 0.98566·m;
Node => D Node 24; 0.75340·m; 0.0018188·m; 0.99128·m;

Node => Wing Node 25; 0.78049·m; 0.0018182·m; 1.0138·m;
Node => D Node 25; 0.77009·m; 0.0017585·m; 1.0196·m;

Node => Wing Node 26; 0.79196·m; 0·m; 1.0437·m;
Node => BC Node 26; 0.79644·m; 0.0017737·m; 1.0412·m;
Node => D Node 26; 0.78628·m; 0.0017042·m; 1.0468·m;

Node => Wing Node 27; 0.80682·m; 0·m; 1.0704·m;
Node => BC Node 27; 0.81181·m; 0.0017248·m; 1.0676·m;
Node => D Node 27; 0.80195·m; 0.0016548·m; 1.0731·m;

Node => Wing Node 28; 0.81709·m; 0.0016096·m; 1.0984·m;
Node => BC Node 28; 0.82681·m; 0.0016596·m; 1.0929·m;

Node => Wing Node 29; 0.83171·m; 0.0015693·m; 1.1226·m;
Node => BC Node 29; 0.84102·m; 0.0016199·m; 1.1174·m;

Node => Wing Node 30; 0.84577·m; 0.0015318·m; 1.1458·m;
Node => BC Node 30; 0.85459·m; 0.0015772·m; 1.1409·m;

Node => Wing Node 31; 0.85927·m; 0.0014969·m; 1.1681·m;
Node => BC Node 31; 0.86752·m; 0.0015322·m; 1.1635·m;

Node => Wing Node 32; 0.87220·m; 0.0014648·m; 1.1893·m;
Node => BC Node 32; 0.87993·m; 0.0014880·m; 1.1850·m;

Node => Wing Node 33; 0.88454·m; 0.0014345·m; 1.2096·m;
Node => BC Node 33; 0.89212·m; 0.0014380·m; 1.2054·m;

Node => Wing Node 34; 0.89630·m; 0.0014058·m; 1.2289·m;
Node => BC Node 34; 0.90215·m; 0.0013965·m; 1.2257·m;

Node => Wing Node 35; 0.90869·m; 0.0014209·m; 1.2466·m;
Node => Wing Node 36; 0.91803·m; 0.0013527·m; 1.2646·m;
Node => BC Node 36; 0.92131·m; 0.0014408·m; 1.2628·m;

Node => Wing Node 37; 0.92801·m; 0.0013283·m; 1.2810·m;
Node => BC Node 37; 0.94085·m; 0.0016641·m; 1.2739·m;

Node => Wing Node 38; 0.93739·m; 0.0013053·m; 1.2964·m;
Node => BC Node 38; 0.96526·m; 0.0018845·m; 1.2809·m;

Node => Wing Node 39; 0.94618·m; 0.0012839·m; 1.3109·m;
Node => BC Node 39; 0.98812·m; 0.0020910·m; 1.2875·m;

Node => Wing Node 40; 0.94964·m; 0·m; 1.3270·m;
Node => BC Node 40; 1.0094·m; 0.0022835·m; 1.2937·m;
Node => D Node 40; 0.95438·m; 0.0012638·m; 1.3244·m;

Node => Exciter Node;  0.25234·m; 0·m; -0.4850·m;
-- ^^ possible inner loading point for excitation mechanism
Node => Exciter Node 2; 0.25234·m; 0·m; -0.5050·m;

-------------------------------------------
-- Container with excitation piezo stacks
    -- Laenge 0.19·m
    -- Mass  50·kg

Elastic_Material => Exciter Mat
  Rho => 12215.3·kg/m^3;
  E_Mod => 1.8115e+011·kg/m·s^2;
  G_Mod => 3.03842e+10·kg/m·s^2;
  kappa => 1.859;

Cylindric_Module => Exciter Container
  Node_1 => Balance Node 14
  Node_2 => Exciter Node
  Material => Exciter Mat
  Area   => 0.02172·m^2
  I_Yy    => 0.0000764·m^4
  I_Zz    => 0.0001276·m^4
  Alpha   => 0
  J       => 0.000139412·m^4

-- closing plate

Elastic_Material => Exciter ExtraMat
  Rho => 12252.3·kg/m^3;
  E_Mod => 1.8115e+011·kg/m·s^2;
  G_Mod => 4.05162e+14·kg/m·s^2;
  kappa => 1.75813;

Cylindric_Module => Exciter Closing Plate
  Node_1 => Exciter Node 2
  Node_2 => Exciter Node
  Material => Exciter ExtraMat
  Area   => 0.02172·m^2
  I_Yy    => 0.0000764·m^4
  I_Zz    => 0.0001276·m^4
  Alpha   => 0
  J       => 0.000131847·m^4

---------------------------------------------
-- Balance elements to follow
---------------------------------------------
 -- Element  1

Elastic_Material => Mat Balance 1
  Rho => 23660.7·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 7.72875e+10·kg/m·s^2;
  kappa => 0.572192;

Cylindric_Module => Balance  1
  Node_1 => Balance Node 1
  Node_2 => Balance Node 2
  Material => Mat Balance 1
  Area   => 3.4335340e-02·m^2
  I_Yy    => 9.1592540e-04·m^4
  I_Zz    => 9.1592540e-04·m^4
  Alpha   => 0
  J       => 0.00193823·m^4

---------------------------------------------
 -- Element  2

Elastic_Material => Mat Balance 2
  Rho => 7860·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8e+10·kg/m·s^2;
  kappa => 0.571175;

Cylindric_Module => Balance  2
  Node_1 => Balance Node 2
  Node_2 => Balance Node 3
  Material => Mat Balance 2
  Area   => 2.8431550e-02·m^2
  I_Yy    => 5.0430430e-04·m^4
  I_Zz    => 5.0430430e-04·m^4
  Alpha   => 0
  J       => 0.00100861·m^4

---------------------------------------------
 -- Element  3

Elastic_Material => Mat Balance 3
  Rho => 18543.4·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 1.2379e+11·kg/m·s^2;
  kappa => 0.369126;

Cylindric_Module => Balance  3
  Node_1 => Balance Node 3
  Node_2 => Balance Node 4
  Material => Mat Balance 3
  Area   => 2.8431550e-02·m^2
  I_Yy    => 5.0430430e-04·m^4
  I_Zz    => 5.0430430e-04·m^4
  Alpha   => 0
  J       => 0.000651819·m^4

---------------------------------------------
 -- Element  4

Elastic_Material => Mat Balance 4
  Rho => 9298.9·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 9.16434e+10·kg/m·s^2;
  kappa => 0.620788;

Cylindric_Module => Balance  4
  Node_1 => Balance Node 4
  Node_2 => Balance Node 5
  Material => Mat Balance 4
  Area   => 1.0296570e-01·m^2
  I_Yy    => 1.2156390e-03·m^4
  I_Zz    => 1.2156390e-03·m^4
  Alpha   => 0
  J       => 0.00212238·m^4

---------------------------------------------
 -- Element  5 - Piezos

Elastic_Material => Mat Balance 5
  Rho => 16765.3·kg/m^3;
  E_Mod => 1.0000000e+11·kg/m·s^2;
  G_Mod => 2.07151e+10·kg/m·s^2;
  kappa => 1.07275;

Cylindric_Module => Balance  5
  Node_1 => Balance Node 5
  Node_2 => Balance Node 6
  Material => Mat Balance 5
  Area   => 9.3600000e-03·m^2
  I_Yy    => 9.3598200e-05·m^4
  I_Zz    => 9.3598200e-05·m^4
  Alpha   => 0
  J       => 0.000200815·m^4

---------------------------------------------
 -- Element  6

Elastic_Material => Mat Balance 6
  Rho => 9719.45·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 7.29899e+10·kg/m·s^2;
  kappa => 0.670847;

Cylindric_Module => Balance  6
  Node_1 => Balance Node 6
  Node_2 => Balance Node 7
  Material => Mat Balance 6
  Area   => 4.0821070e-02·m^2
  I_Yy    => 3.2663230e-04·m^4
  I_Zz    => 3.2663230e-04·m^4
  Alpha   => 0
  J       => 0.000716006·m^4

---------------------------------------------
 -- Element  7

Elastic_Material => Mat Balance 7
  Rho => 7860·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8e+10·kg/m·s^2;
  kappa => 0.596984;

Cylindric_Module => Balance  7
  Node_1 => Balance Node 7
  Node_2 => Balance Node 8
  Material => Mat Balance 7
  Area   => 3.5053110e-02·m^2
  I_Yy    => 2.9656900e-04·m^4
  I_Zz    => 2.9656900e-04·m^4
  Alpha   => 0
  J       => 0.000593138·m^4

---------------------------------------------
 -- Element  8

Elastic_Material => Mat Balance 8
  Rho => 7860·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8e+10·kg/m·s^2;
  kappa => 0.575643;

Cylindric_Module => Balance  8
  Node_1 => Balance Node 8
  Node_2 => Balance Node 9
  Material => Mat Balance 8
  Area   => 1.8785740e-02·m^2
  I_Yy    => 1.7076620e-04·m^4
  I_Zz    => 1.7076620e-04·m^4
  Alpha   => 0
  J       => 0.000341532·m^4

---------------------------------------------
 -- Element  9

Elastic_Material => Mat Balance 9
  Rho => 7860·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8e+10·kg/m·s^2;
  kappa => 0.569657;

Cylindric_Module => Balance  9
  Node_1 => Balance Node 9
  Node_2 => Balance Node 10
  Material => Mat Balance 9
  Area   => 8.5451320e-03·m^2
  I_Yy    => 7.9132200e-05·m^4
  I_Zz    => 7.9132200e-05·m^4
  Alpha   => 0
  J       => 0.000158264·m^4

---------------------------------------------
 -- Element  10

Elastic_Material => Mat Balance 10
  Rho => 7860·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8e+10·kg/m·s^2;
  kappa => 0.575947;

Cylindric_Module => Balance  10
  Node_1 => Balance Node 10
  Node_2 => Balance Node 11
  Material => Mat Balance 10
  Area   => 1.9653800e-02·m^2
  I_Yy    => 1.8305800e-04·m^4
  I_Zz    => 1.8305800e-04·m^4
  Alpha   => 0
  J       => 0.000366116·m^4

---------------------------------------------
 -- Element  11

Elastic_Material => Mat Balance 11
  Rho => 7860·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8e+10·kg/m·s^2;
  kappa => 0.586243;

Cylindric_Module => Balance  11
  Node_1 => Balance Node 11
  Node_2 => Balance Node 12
  Material => Mat Balance 11
  Area   => 3.0762480e-02·m^2
  I_Yy    => 2.8947490e-04·m^4
  I_Zz    => 2.8947490e-04·m^4
  Alpha   => 0
  J       => 0.00057895·m^4

---------------------------------------------
 -- Element  12

Elastic_Material => Mat Balance 12
  Rho => 28401.8·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 8.03679e+10·kg/m·s^2;
  kappa => 0.573216;

Cylindric_Module => Balance  12
  Node_1 => Balance Node 12
  Node_2 => Balance Node 14
  Material => Mat Balance 12
  Area   => 8.5133130e-03·m^2
  I_Yy    => 7.8731110e-05·m^4
  I_Zz    => 7.8731110e-05·m^4
  Alpha   => 0
  J       => 0.000160221·m^4

---------------------------------------------
 -- Element  14

Elastic_Material => Mat Balance 14
  Rho => 47622·kg/m^3;
  E_Mod => 2.1000000e+11·kg/m·s^2;
  G_Mod => 1.24671e+11·kg/m·s^2;
  kappa => 0.369518;

Cylindric_Module => Balance  14
  Node_1 => Balance Node 14
  Node_2 => Balance Node 15
  Material => Mat Balance 14
  Area   => 8.5133130e-03·m^2
  I_Yy    => 7.8731110e-05·m^4
  I_Zz    => 7.8731110e-05·m^4
  Alpha   => 0
  J       => 0.000103285·m^4

---------------------------------------------
 -- Element  15

Elastic_Material => Mat Balance 15
  Rho => 19192.2·kg/m^3;
  E_Mod => 1.8114930e+11·kg/m·s^2;
  G_Mod => 3.33676e+10·kg/m·s^2;
  kappa => 1.6934;

Cylindric_Module => Balance  15
  Node_1 => Balance Node 15
  Node_2 => Balance Node 16
  Material => Mat Balance 15
  Area   => 8.1600000e-03·m^2
  I_Yy    => 5.3642000e-5·m^4
  I_Zz    => 1.0675730e-5·m^4
  Alpha   => 0
  J       => 5.30837e-05·m^4

---------------------------------------------
 -- Element  16

Elastic_Material => Mat Balance 16
  Rho => 8047.71·kg/m^3;
  E_Mod => 1.8114930e+11·kg/m·s^2;
  G_Mod => 1.39918e+10·kg/m·s^2;
  kappa => 4.03842;

Cylindric_Module => Balance  16
  Node_1 => Balance Node 16
  Node_2 => Balance Node 17
  Material => Mat Balance 16
  Area   => 1.9460000e-02·m^2
  I_Yy    => 5.3642000e-5·m^4
  I_Zz    => 1.0675730e-5·m^4
  Alpha   => 0
  J       => 0.000126594·m^4

---------------------------------------------
 -- Element  17
    -- Span from -0.16800·m to -0.12600·m
    -- Length 0.042000·m
    -- Mass  6.1538·kg


Elastic_Material => Mat  Balance 17
  Rho => 8054.1·kg/m^3;
  -- incl. 2.485kg/m for wiring
  E_Mod => 1.813e+011·kg/m·s^2;
  G_Mod => 2.8971e+010·kg/m·s^2/3;
  kappa => 5.877;

Cylindric_Module => Balance  17
  Node_1 => Balance Node 17
  Node_2 => Balance Node 18
  Material => Mat  Balance 17
  Area   => 0.018500·m^2
  I_Yy    => 0.0002·m^4
  I_Zz    => 0.00001·m^4
  Alpha   => -1.3506e-012
  J       => 0.00012153·m^4

---------------------------------------------
 -- Element  18
    -- Span from -0.12600·m to -0.084000·m
    -- Length 0.042000·m
    -- Mass  7.3257·kg


Elastic_Material => Mat  Balance 18
  Rho => 8027.8·kg/m^3;
  -- incl. 2.485kg/m for wiring
  E_Mod => 1.813e+011·kg/m·s^2;
  G_Mod => 2.4404e+010·kg/m·s^2/3;
  kappa => 6.99;

Cylindric_Module => Balance  18
  Node_1 => Balance Node 18
  Node_2 => Balance Node 19
  Material => Mat  Balance 18
  Area   => 0.022023·m^2
  I_Yy    => 0.0002·m^4
  I_Zz    => 0.000023·m^4
  Alpha   => -0.000099907
  J       => 0.00014428·m^4

---------------------------------------------
 -- Element  19
    -- Span from -0.084000·m to -0.042000·m
    -- Length 0.042000·m
    -- Mass  8.2051·kg


Elastic_Material => Mat  Balance 19
  Rho => 8009.3·kg/m^3;
  -- incl. 2.485kg/m for wiring
  E_Mod => 1.813e+011·kg/m·s^2;
  G_Mod => 2.1490e+010·kg/m·s^2/3;
  kappa => 7.92;

Cylindric_Module => Balance  19
  Node_1 => Balance Node 19
  Node_2 => Balance Node 20
  Material => Mat  Balance 19
  Area   => 0.024667·m^2
  I_Yy    => 0.0002·m^4
  I_Zz => 0.00003·m^4
  Alpha => -0.0065391
  J       => 0.00016384·m^4

---------------------------------------------
 -- Element  20
    -- Span from -0.042000·m to 0·m
    -- Length 0.042000·m
    -- Mass  7.4461·kg


Elastic_Material => Mat  Balance 20
  Rho => 6644.3·kg/m^3;
  -- incl. 2.485kg/m for wiring
  E_Mod => 1.813e+011·kg/m·s^2;
  G_Mod => 1.3304e+010·kg/m·s^2/3;
  kappa => 12.78;

Cylindric_Module => Balance  20
  Node_1 => Balance Node 20
  Node_2 => Balance Node 21
  Material => Mat  Balance 20
  Area   => 0.022385·m^2
  I_Yy    => 0.00025·m^4
  I_Zz => 0.00002·m^4
  Alpha   => -0.025731
  J       => 0.00017617·m^4

---------------------------------------------
Module_Discretization => 0.0·m;
 -- Wing Element  1
    -- Span from 0·m to 0.052582·m
    -- Length 0.056846·m
    -- Mass  6.8227·kg

Elastic_Material => Mat  1 
  Rho => 6448.4·kg/m^3;
  -- incl. 2.485kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 6564500000·kg/m·s^2
  kappa => 8.8784;

Cylindric_Module => Wing Beam 1
  Node_1 => Balance Node 21
  Node_2 => Wing Node 1
  Material => Mat  1
  Area   => 0.015154·m^2
  I_Yy    => 0.00015586·m^4
  I_Zz    => 0.0000055847·m^4
  Alpha   => -0.026478
  J      => 0.00016145·m^4

---------------------------------------------
 -- Wing Element  2
    -- Span from 0.052582·m to 0.10417·m
    -- Length 0.055770·m
    -- Mass  4.6616·kg

Elastic_Material => Mat  2
  Rho => 7147.6·kg/m^3;
  -- incl. 2.485kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 6847200000·kg/m·s^2
  kappa => 8.5119;

Cylindric_Module => Wing Beam 2
  Node_1 => Wing Node 1
  Node_2 => Wing Node 2
  Material => Mat  2
  Area   => 0.010554·m^2
  I_Yy    => 0.00012063·m^4
  I_Zz    => 0.0000036224·m^4
  Alpha   => -0.018180
  J      => 0.00012425·m^4

---------------------------------------------
 -- Wing Element  3
    -- Span from 0.10417·m to 0.15476·m
    -- Length 0.054694·m
    -- Mass  4.0132·kg

Elastic_Material => Mat  3
  Rho => 8162.2·kg/m^3;
  -- incl. 2.485kg/m fuer kabel
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 6224300000·kg/m·s^2
  kappa => 9.3637;

Cylindric_Module => Wing Beam 3
  Node_1 => Wing Node 2
  Node_2 => Wing Node 3
  Material => Mat  3
  Area   => 0.0092645·m^2
  I_Yy    => 0.00010061·m^4
  I_Zz    => 0.0000025811·m^4
  Alpha   => -0.014733
  J      => 0.00010319·m^4

---------------------------------------------
 -- Wing Element  4
    -- Span from 0.15476·m to 0.20436·m
    -- Length 0.053618·m
    -- Mass  3.4204·kg

Elastic_Material => Mat  4
  Rho => 8186.3·kg/m^3;
  -- incl. 2.32kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 5344100000·kg/m·s^2
  kappa => 10.906;

Cylindric_Module => Wing Beam 4
  Node_1 => Wing Node 3
  Node_2 => Wing Node 4
  Material => Mat  4
  Area   => 0.0080545·m^2
  I_Yy    => 0.000084573·m^4
  I_Zz    => 0.0000018226·m^4
  Alpha   => -0.010752
  J      => 0.000086396·m^4

---------------------------------------------
 -- Wing Element  5
    -- Span from 0.20436·m to 0.25296·m
    -- Length 0.052542·m
    -- Mass  2.9004·kg

Elastic_Material => Mat  5
  Rho => 8208.2·kg/m^3;
  -- incl. 2.074kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4586900000·kg/m·s^2
  kappa => 12.706;

Cylindric_Module => Wing Beam 5
  Node_1 => Wing Node 4
  Node_2 => Wing Node 5
  Material => Mat  5
  Area   => 0.0069699·m^2
  I_Yy    => 0.000069240·m^4
  I_Zz    => 0.0000012563·m^4
  Alpha   => -0.0066207
  J      => 0.000070496·m^4

---------------------------------------------
 -- Wing Element  6
    -- Span from 0.25296·m to 0.30057·m
    -- Length 0.052498·m
    -- Mass  2.5489·kg

Elastic_Material => Mat  6
  Rho => 8655.6·kg/m^3;
  -- incl. 2.074kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4074400000·kg/m·s^2
  kappa => 14.305;

Cylindric_Module => Wing Beam 6
  Node_1 => Wing Node 5
  Node_2 => Wing Node 6
  Material => Mat  6
  Area   => 0.0061302·m^2
  I_Yy    => 0.000056645·m^4
  I_Zz    => 8.7048e-007·m^4
  Alpha   => -0.0040884
  J      => 0.000057515·m^4

---------------------------------------------
 -- Wing Element  7
    -- Span from 0.30057·m to 0.34718·m
    -- Length 0.053343·m
    -- Mass  2.2930·kg

Elastic_Material => Mat  7
  Rho => 8180.6·kg/m^3;
  -- incl. 2.074kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4180400000·kg/m·s^2
  kappa => 13.942;

Cylindric_Module => Wing Beam 7
  Node_1 => Wing Node 6
  Node_2 => Wing Node 7
  Material => Mat  7
  Area   => 0.0054274·m^2
  I_Yy    => 0.000043729·m^4
  I_Zz    => 6.7936e-007·m^4
  Alpha   => -0.0054999
  J      => 0.000044408·m^4

---------------------------------------------
 -- Wing Element  8
    -- Span from 0.34718·m to 0.39279·m
    -- Length 0.052204·m
    -- Mass  2.0089·kg

Elastic_Material => Mat  8
  Rho => 8327.5·kg/m^3;
  -- incl. 2.074kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4424200000·kg/m·s^2
  kappa => 13.174;

Cylindric_Module => Wing Beam 8
  Node_1 => Wing Node 7
  Node_2 => Wing Node 8
  Material => Mat  8
  Area   => 0.0048587·m^2
  I_Yy    => 0.000033434·m^4
  I_Zz    => 5.7496e-007·m^4
  Alpha   => -0.0073747
  J      => 0.000034009·m^4

---------------------------------------------
 -- Wing Element  9
    -- Span from 0.39279·m to 0.43741·m
    -- Length 0.051065·m
    -- Mass  1.8229·kg

Elastic_Material => Mat  9
  Rho => 8340.3·kg/m^3;
  -- incl. 1.90kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4357400000·kg/m·s^2
  kappa => 13.376;

Cylindric_Module => Wing Beam 9
  Node_1 => Wing Node 8
  Node_2 => Wing Node 9
  Material => Mat  9
  Area   => 0.0045072·m^2
  I_Yy    => 0.000028339·m^4
  I_Zz    => 4.9805e-007·m^4
  Alpha   => -0.0077845
  J      => 0.000028838·m^4

---------------------------------------------
 -- Wing Element  10
    -- Span from 0.43741·m to 0.48104·m
    -- Length 0.049926·m
    -- Mass  1.6659·kg

Elastic_Material => Mat  10
  Rho => 8317.8·kg/m^3;
  -- incl. 1.678kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4310700000·kg/m·s^2
  kappa => 13.520;

Cylindric_Module => Wing Beam 10
  Node_1 => Wing Node 9
  Node_2 => Wing Node 10
  Material => Mat  10
  Area   => 0.0042130·m^2
  I_Yy    => 0.000024692·m^4
  I_Zz    => 4.3097e-007·m^4
  Alpha   => -0.0078045
  J      => 0.000025123·m^4

---------------------------------------------
 -- Wing Element  11
    -- Span from 0.48104·m to 0.52367·m
    -- Length 0.048787·m
    -- Mass  1.5169·kg

Elastic_Material => Mat  11
  Rho => 8346.1·kg/m^3;
  -- incl. 1.678kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4379500000·kg/m·s^2
  kappa => 13.308;

Cylindric_Module => Wing Beam 11
  Node_1 => Wing Node 10
  Node_2 => Wing Node 11
  Material => Mat  11
  Area   => 0.0039259·m^2
  I_Yy    => 0.000021298·m^4
  I_Zz    => 3.7257e-007·m^4
  Alpha   => -0.0077225
  J      => 0.000021671·m^4

---------------------------------------------
 -- Wing Element  12
    -- Span from 0.52367·m to 0.56530·m
    -- Length 0.047648·m
    -- Mass  1.3781·kg

Elastic_Material => Mat  12
  Rho => 8378.9·kg/m^3;
  -- incl. 1.678kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4417200000·kg/m·s^2
  kappa => 13.195;

Cylindric_Module => Wing Beam 12
  Node_1 => Wing Node 11
  Node_2 => Wing Node 12
  Material => Mat  12
  Area   => 0.0036517·m^2
  I_Yy    => 0.000018294·m^4
  I_Zz    => 3.2124e-007·m^4
  Alpha   => -0.0077907
  J      => 0.000018616·m^4

---------------------------------------------
 -- Wing Element  13
    -- Span from 0.56530·m to 0.60594·m
    -- Length 0.046509·m
    -- Mass  1.2539·kg

Elastic_Material => Mat  13
  Rho => 8367.6·kg/m^3;
  -- incl. 1.521kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4362500000·kg/m·s^2
  kappa => 13.360;

Cylindric_Module => Wing Beam 13
  Node_1 => Wing Node 12
  Node_2 => Wing Node 13
  Material => Mat  13
  Area   => 0.0034042·m^2
  I_Yy    => 0.000015815·m^4
  I_Zz    => 2.7674e-007·m^4
  Alpha   => -0.0078292
  J      => 0.000016092·m^4

---------------------------------------------
 -- Wing Element  14
    -- Span from 0.60594·m to 0.64559·m
    -- Length 0.045370·m
    -- Mass  1.1367·kg

Elastic_Material => Mat  14
  Rho => 8329.2·kg/m^3;
  -- incl. 1.298kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4307900000·kg/m·s^2
  kappa => 13.529;

Cylindric_Module => Wing Beam 14
  Node_1 => Wing Node 13
  Node_2 => Wing Node 14
  Material => Mat  14
  Area   => 0.0031634·m^2
  I_Yy    => 0.000013557·m^4
  I_Zz    => 2.3760e-007·m^4
  Alpha   => -0.0079146
  J      => 0.000013795·m^4

---------------------------------------------
 -- Wing Element  15
    -- Span from 0.64559·m to 0.68423·m
    -- Length 0.044231·m
    -- Mass  1.0323·kg

Elastic_Material => Mat  15
  Rho => 8359.2·kg/m^3;
  -- incl. 1.298kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4235300000·kg/m·s^2
  kappa => 13.761;

Cylindric_Module => Wing Beam 15
  Node_1 => Wing Node 14
  Node_2 => Wing Node 15
  Material => Mat  15
  Area   => 0.0029469·m^2
  I_Yy    => 0.000011704·m^4
  I_Zz    => 2.0379e-007·m^4
  Alpha   => -0.0078532
  J      => 0.000011908·m^4

---------------------------------------------
 -- Wing Element  16
    -- Span from 0.68423·m to 0.72189·m
    -- Length 0.043092·m
    -- Mass  0.93021·kg

Elastic_Material => Mat  16
  Rho => 8395.1·kg/m^3;
  -- incl. 1.298kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4306700000·kg/m·s^2
  kappa => 13.533;

Cylindric_Module => Wing Beam 16
  Node_1 => Wing Node 15
  Node_2 => Wing Node 16
  Material => Mat  16
  Area   => 0.0027256·m^2
  I_Yy    => 0.0000099161·m^4
  I_Zz    => 1.7400e-007·m^4
  Alpha   => -0.0079546
  J      => 0.000010090·m^4

---------------------------------------------
 -- Wing Element  17
    -- Span from 0.72189·m to 0.75855·m
    -- Length 0.041953·m
    -- Mass  0.82467·kg

Elastic_Material => Mat  17
  Rho => 8442.7·kg/m^3;
  -- incl. 1.298kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4560100000·kg/m·s^2
  kappa => 12.781;

Cylindric_Module => Wing Beam 17
  Node_1 => Wing Node 16
  Node_2 => Wing Node 17
  Material => Mat  17
  Area   => 0.0024819·m^2
  I_Yy    => 0.0000081787·m^4
--  I_Zz    => 1.335e-007·m^4
  I_Zz    => 1.4827e-007·m^4
  Alpha   => -0.0082952
  J      => 0.0000083270·m^4

---------------------------------------------
 -- Wing Element  18
    -- Span from 0.75855·m to 0.79421·m
    -- Length 0.040814·m
    -- Mass  0.73464·kg

Elastic_Material => Mat  18
  Rho => 8325.7·kg/m^3;
  -- incl. 0.929kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4546200000·kg/m·s^2
  kappa => 12.820;

Cylindric_Module => Wing Beam 18
  Node_1 => Wing Node 17
  Node_2 => Wing Node 18
  Material => Mat  18
  Area   => 0.0022727·m^2
  I_Yy    => 0.0000071085·m^4
  I_Zz    => 1.2667e-007·m^4
  Alpha   => -0.0079927
  J      => 0.0000072352·m^4

---------------------------------------------
 -- Wing Element  19
    -- Span from 0.79421·m to 0.82888·m
    -- Length 0.039675·m
    -- Mass  0.65002·kg

Elastic_Material => Mat  19
  Rho => 8367.3·kg/m^3;
  -- incl. 0.929kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4535100000·kg/m·s^2
  kappa => 12.851;

Cylindric_Module => Wing Beam 19
  Node_1 => Wing Node 18
  Node_2 => Wing Node 19
  Material => Mat  19
  Area   => 0.0020686·m^2
  I_Yy    => 0.0000061395·m^4
  I_Zz    => 1.0711e-007·m^4
  Alpha   => -0.0077976
  J      => 0.0000062466·m^4

---------------------------------------------
 -- Wing Element  20
    -- Span from 0.82888·m to 0.86255·m
    -- Length 0.038536·m
    -- Mass  0.57536·kg

Elastic_Material => Mat  20
  Rho => 8319.2·kg/m^3;
  -- incl. 0.753kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4493200000·kg/m·s^2
  kappa => 12.971;

Cylindric_Module => Wing Beam 20
  Node_1 => Wing Node 19
  Node_2 => Wing Node 20
  Material => Mat  20
  Area   => 0.0018851·m^2
  I_Yy    => 0.0000053548·m^4
  I_Zz    => 9.2824e-008·m^4
  Alpha   => -0.0082993
  J      => 0.0000054476·m^4

---------------------------------------------
 -- Wing Element  21
    -- Span from 0.86255·m to 0.89523·m
    -- Length 0.037397·m
    -- Mass  0.52971·kg

Elastic_Material => Mat  21
  Rho => 8248.0·kg/m^3;
  -- incl. 0.594kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4419000000·kg/m·s^2
  kappa => 13.189;

Cylindric_Module => Wing Beam 21
  Node_1 => Wing Node 20
  Node_2 => Wing Node 21
  Material => Mat  21
  Area   => 0.0017884·m^2
  I_Yy    => 0.0000047698·m^4
  I_Zz    => 8.3094e-008·m^4
  Alpha   => -0.0086220
  J      => 0.0000048529·m^4

---------------------------------------------
 -- Wing Element  22
    -- Span from 0.89523·m to 0.92691·m
    -- Length 0.036258·m
    -- Mass  0.48660·kg

Elastic_Material => Mat  22
  Rho => 8267.5·kg/m^3;
  -- incl. 0.594kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4469700000·kg/m·s^2
  kappa => 13.040;

Cylindric_Module => Wing Beam 22
  Node_1 => Wing Node 21
  Node_2 => Wing Node 22
  Material => Mat  22
  Area   => 0.0016945·m^2
  I_Yy    => 0.0000041859·m^4
  I_Zz    => 7.4661e-008·m^4
  Alpha   => -0.0091779
  J      => 0.0000042606·m^4

---------------------------------------------
 -- Wing Element  23
    -- Span from 0.92691·m to 0.95760·m
    -- Length 0.035119·m
    -- Mass  0.45297·kg

Elastic_Material => Mat  23
  Rho => 8284.8·kg/m^3;
  -- incl. 0.594kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4340700000·kg/m·s^2
  kappa => 13.427;

Cylindric_Module => Wing Beam 23
  Node_1 => Wing Node 22
  Node_2 => Wing Node 23
  Material => Mat  23
  Area   => 0.0016285·m^2
  I_Yy    => 0.0000038255·m^4
  I_Zz    => 6.7262e-008·m^4
  Alpha   => -0.0087873
  J      => 0.0000038928·m^4

---------------------------------------------
 -- Wing Element  24
    -- Span from 0.95760·m to 0.98729·m
    -- Length 0.033980·m
    -- Mass  0.42155·kg

Elastic_Material => Mat  24
  Rho => 8298.6·kg/m^3;
  -- incl. 0.594kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4198100000·kg/m·s^2
  kappa => 13.883;

Cylindric_Module => Wing Beam 24
  Node_1 => Wing Node 23
  Node_2 => Wing Node 24
  Material => Mat  24
  Area   => 0.0015664·m^2
  I_Yy    => 0.0000035026·m^4
  I_Zz    => 6.0638e-008·m^4
  Alpha   => -0.0085234
  J      => 0.0000035632·m^4

---------------------------------------------
 -- Wing Element  25
    -- Span from 0.98729·m to 1.0160·m
    -- Length 0.032841·m
    -- Mass  0.38958·kg

Elastic_Material => Mat  25
  Rho => 8311.6·kg/m^3;
  -- incl. 0.594kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4128700000·kg/m·s^2
  kappa => 14.117;

Cylindric_Module => Wing Beam 25
  Node_1 => Wing Node 24
  Node_2 => Wing Node 25
  Material => Mat  25
  Area   => 0.0014978·m^2
  I_Yy    => 0.0000031483·m^4
  I_Zz    => 5.4672e-008·m^4
  Alpha   => -0.0085848
  J      => 0.0000032030·m^4

---------------------------------------------
 -- Wing Element  26
    -- Span from 1.0160·m to 1.0437·m
    -- Length 0.031702·m
    -- Mass  0.35884·kg

Elastic_Material => Mat  26
  Rho => 8394.4·kg/m^3;
  -- incl. 0.68kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4096500000·kg/m·s^2
  kappa => 14.227;

Cylindric_Module => Wing Beam 26
  Node_1 => Wing Node 25
  Node_2 => Wing Node 26
  Material => Mat  26
  Area   => 0.0014292·m^2
  I_Yy    => 0.0000028054·m^4
  I_Zz    => 4.9311e-008·m^4
  Alpha   => -0.0086044
  J      => 0.0000028547·m^4

---------------------------------------------
 -- Wing Element  27
    -- Span from 1.0437·m to 1.0704·m
    -- Length 0.030563·m
    -- Mass  0.33227·kg

Elastic_Material => Mat  27
  Rho => 8567.7·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 3997200000·kg/m·s^2
  kappa => 14.581;

Cylindric_Module => Wing Beam 27
  Node_1 => Wing Node 26
  Node_2 => Wing Node 27
  Material => Mat  27
  Area   => 0.0013727·m^2
  I_Yy    => 0.0000025508·m^4
  I_Zz    => 4.4481e-008·m^4
  Alpha   => -0.0082088
  J      => 0.0000025952·m^4

---------------------------------------------
 -- Wing Element  28
    -- Span from 1.0704·m to 1.0961·m
    -- Length 0.029424·m
    -- Mass  0.30639·kg

Elastic_Material => Mat  28
  Rho => 8594.8·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 3966100000·kg/m·s^2
  kappa => 14.695;

Cylindric_Module => Wing Beam 28
  Node_1 => Wing Node 27
  Node_2 => Wing Node 28
  Material => Mat  28
  Area   => 0.0013148·m^2
  I_Yy    => 0.0000022960·m^4
  I_Zz    => 4.0212e-008·m^4
  Alpha   => -0.0084585
  J      => 0.0000023362·m^4

---------------------------------------------
 -- Wing Element  29
    -- Span from 1.0961·m to 1.1208·m
    -- Length 0.028285·m
    -- Mass  0.28244·kg

Elastic_Material => Mat  29
  Rho => 8625.4·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 3963300000·kg/m·s^2
  kappa => 14.706;

Cylindric_Module => Wing Beam 29
  Node_1 => Wing Node 28
  Node_2 => Wing Node 29
  Material => Mat  29
  Area   => 0.0012608·m^2
  I_Yy    => 0.0000020691·m^4
  I_Zz    => 3.6405e-008·m^4
  Alpha   => -0.0085887
  J      => 0.0000021055·m^4

---------------------------------------------
 -- Wing Element  30
    -- Span from 1.1208·m to 1.1445·m
    -- Length 0.027146·m
    -- Mass  0.26068·kg

Elastic_Material => Mat  30
  Rho => 8653.9·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 3979400000·kg/m·s^2
  kappa => 14.646;

Cylindric_Module => Wing Beam 30
  Node_1 => Wing Node 29
  Node_2 => Wing Node 30
  Material => Mat  30
  Area   => 0.0012125·m^2
  I_Yy    => 0.0000018775·m^4
  I_Zz    => 3.3024e-008·m^4
  Alpha   => -0.0083811
  J      => 0.0000019105·m^4

---------------------------------------------
 -- Wing Element  31
    -- Span from 1.1445·m to 1.1673·m
    -- Length 0.026007·m
    -- Mass  0.24108·kg

Elastic_Material => Mat  31
  Rho => 8680.7·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4035700000·kg/m·s^2
  kappa => 14.442;

Cylindric_Module => Wing Beam 31
  Node_1 => Wing Node 30
  Node_2 => Wing Node 31
  Material => Mat  31
  Area   => 0.0011704·m^2
  I_Yy    => 0.0000017198·m^4
  I_Zz    => 3.0091e-008·m^4
  Alpha   => -0.0083682
  J      => 0.0000017499·m^4

---------------------------------------------
 -- Wing Element  32
    -- Span from 1.1673·m to 1.1890·m
    -- Length 0.024868·m
    -- Mass  0.22258·kg

Elastic_Material => Mat  32
  Rho => 8707.6·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4155200000·kg/m·s^2
  kappa => 14.027;

Cylindric_Module => Wing Beam 32
  Node_1 => Wing Node 31
  Node_2 => Wing Node 32
  Material => Mat  32
  Area   => 0.0011301·m^2
  I_Yy    => 0.0000015751·m^4
  I_Zz    => 2.7409e-008·m^4
  Alpha   => -0.0084164
  J      => 0.0000016026·m^4

---------------------------------------------
 -- Wing Element  33
    -- Span from 1.1890·m to 1.2097·m
    -- Length 0.023729·m
    -- Mass  0.20444·kg

Elastic_Material => Mat  33
  Rho => 8716.3·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4403800000·kg/m·s^2
  kappa => 13.235;

Cylindric_Module => Wing Beam 33
  Node_1 => Wing Node 32
  Node_2 => Wing Node 33
  Material => Mat  33
  Area   => 0.0010878·m^2
  I_Yy    => 0.0000014294·m^4
  I_Zz    => 2.4976e-008·m^4
  Alpha   => -0.0087070
  J      => 0.0000014544·m^4

---------------------------------------------
 -- Wing Element  34
    -- Span from 1.2097·m to 1.2295·m
    -- Length 0.022590·m
    -- Mass  0.18877·kg

Elastic_Material => Mat  34
  Rho => 8755.2·kg/m^3;
  -- incl. 0.891kg/m for wiring
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4635200000·kg/m·s^2
  kappa => 12.574;

Cylindric_Module => Wing Beam 34
  Node_1 => Wing Node 33
  Node_2 => Wing Node 34
  Material => Mat  34
  Area   => 0.0010551·m^2
  I_Yy    => 0.0000013197·m^4
  I_Zz    => 2.2871e-008·m^4
  Alpha   => -0.0090430
  J      => 0.0000013425·m^4

---------------------------------------------
 -- Wing Element  35
    -- Span from 1.2295·m to 1.2482·m
    -- Length 0.021451·m
    -- Mass  0.19573·kg

Elastic_Material => Mat  35
  Rho => 7920.0·kg/m^3;
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4339600000·kg/m·s^2
  kappa => 13.431;

Cylindric_Module => Wing Beam 35
  Node_1 => Wing Node 34
  Node_2 => Wing Node 35
  Material => Mat  35
  Area   => 0.0011521·m^2
  I_Yy    => 0.0000013740·m^4
  I_Zz    => 2.1939e-008·m^4
  Alpha   => -0.0079439
  J      => 0.0000013959·m^4

---------------------------------------------
 -- Wing Element  36
    -- Span from 1.2482·m to 1.2660·m
    -- Length 0.020312·m
    -- Mass  0.21434·kg

Elastic_Material => Mat  36
  Rho => 7920.0·kg/m^3;
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 4450300000·kg/m·s^2
  kappa => 13.097;

Cylindric_Module => Wing Beam 36
  Node_1 => Wing Node 35
  Node_2 => Wing Node 36
  Material => Mat  36
  Area   => 0.0013324·m^2
  I_Yy    => 0.0000013036·m^4
  I_Zz    => 2.2424e-008·m^4
  Alpha   => -0.0078737
  J      => 0.0000013260·m^4

---------------------------------------------
 -- Wing Element  37
    -- Span from 1.2660·m to 1.2827·m
    -- Length 0.019173·m
    -- Mass  0.19681·kg

Elastic_Material => Mat  37
  Rho => 6761.8·kg/m^3;
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 6076500000·kg/m·s^2
  kappa => 9.5915;

Cylindric_Module => Wing Beam 37
  Node_1 => Wing Node 36
  Node_2 => Wing Node 37
  Material => Mat  37
  Area   => 0.0012960·m^2
  I_Yy    => 9.2756e-007·m^4
  I_Zz    => 1.9179e-008·m^4
  Alpha   => -0.0076318
  J      => 9.4674e-007·m^4

---------------------------------------------
 -- Wing Element  38
    -- Span from 1.2827·m to 1.2985·m
    -- Length 0.018034·m
    -- Mass  0.13589·kg

Elastic_Material => Mat  38
  Rho => 5622.3·kg/m^3;
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 16168000000·kg/m·s^2
  kappa => 3.6047;

Cylindric_Module => Wing Beam 38
  Node_1 => Wing Node 37
  Node_2 => Wing Node 38
  Material => Mat  38
  Area   => 0.00095141·m^2
  I_Yy    => 3.3146e-007·m^4
  I_Zz    => 9.4767e-009·m^4
  Alpha   => 0.0083823
  J      => 3.4093e-007·m^4

---------------------------------------------
 -- Wing Element  39
    -- Span from 1.2985·m to 1.3132·m
    -- Length 0.016895·m
    -- Mass  0.073291·kg

Elastic_Material => Mat  39
  Rho => 5622.3·kg/m^3;
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 26082000000·kg/m·s^2
  kappa => 2.2346;

Cylindric_Module => Wing Beam 39
  Node_1 => Wing Node 38
  Node_2 => Wing Node 39
  Material => Mat  39
  Area   => 0.00054773·m^2
  I_Yy    => 1.3376e-007·m^4
  I_Zz    => 4.2529e-009·m^4
  Alpha   => 0.020311
  J      => 1.3801e-007·m^4

---------------------------------------------
 -- Wing Element  40
    -- Span from 1.3132·m to 1.3270·m
    -- Length 0.015756·m
    -- Mass  0.023019·kg

Elastic_Material => Mat  40
  Rho => 5622.3·kg/m^3;
  E_Mod => 186110000000·kg/m·s^2
  G_Mod => 26082000000·kg/m·s^2
  kappa => 2.2346;

Cylindric_Module => Wing Beam 40
  Node_1 => Wing Node 39
  Node_2 => Wing Node 40
  Material => Mat  40
  Area   => 0.00018446·m^2
  I_Yy    => 4.5047e-008·m^4
  I_Zz    => 1.4323e-009·m^4
  Alpha   => 0.020311
  J      => 4.6480e-008·m^4
`.trim();

@customElement('axee-visuals-3d')
export class AxeeVisuals3D extends LitElement {
  @property({type: Array}) galaxiesData: GalaxyData[] = [];
  @property({type: String}) currentGalaxyId: string | null = null;
  @property({type: String}) selectedPlanetId: string | null = null;
  @property({type: String}) viewMode: 'galaxies' | 'planets' = 'galaxies';
  @property({type: Boolean}) isScanning = false;
  @property({type: Array}) groundingChunks: GroundingChunk[] = [];

  @query('#three-canvas') private canvas!: HTMLCanvasElement;
  @state() private selectedPlanetData: PlanetData | null = null;
  @state() private hoverLabel = {text: '', x: 0, y: 0, visible: false};
  @state() private hoveredObjectId: string | null = null;
  @state() private currentFactoidIndex = 0;
  @state() private displayedFactoidText = '';
  @state() private structureAnalysis: string | null = null;
  @state() private isAnalyzingStructure = false;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private ai: GoogleGenAI;

  private galaxyGroup = new THREE.Group();
  private planetGroups = new Map<string, THREE.Group>();
  private galaxyRenderObjects = new Map<string, THREE.Group>();

  private animationFrameId = 0;
  private targetPosition = new THREE.Vector3(0, 50, 150);
  private targetLookAt = new THREE.Vector3(0, 0, 0);
  private isManualControl = false;
  private factoidInterval: number | null = null;
  private typingTimeout: number | null = null;

  private starfield!: THREE.Points;
  private starfieldMaterial!: THREE.ShaderMaterial;

  constructor() {
    super();
    this.ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      position: relative;
    }

    #three-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .hover-label {
      position: absolute;
      background: rgba(0, 20, 0, 0.85);
      color: #0f0;
      padding: 0.25rem 0.5rem;
      border: 1px solid #0f0;
      border-radius: 4px;
      font-size: 0.9rem;
      pointer-events: none;
      transform: translate(-50%, -150%);
      transition: opacity 0.2s;
      white-space: nowrap;
      text-shadow: 0 0 5px #0f0;
    }

    .info-panel {
      position: absolute;
      top: 50%;
      right: 2rem;
      transform: translateY(-50%);
      width: 400px;
      max-width: 90vw;
      max-height: 80vh;
      overflow-y: auto;
      padding: 1.5rem;
      background: rgba(0, 20, 0, 0.85);
      border: 1px solid #0f0;
      box-shadow: 0 0 20px #0f0 inset;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
      transition: opacity 0.5s ease, transform 0.5s ease;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-50%) translateX(20px);
    }

    .info-panel.visible {
      opacity: 1;
      pointer-events: all;
      transform: translateY(-50%) translateX(0);
    }

    .info-panel h2 {
      font-size: 2rem;
      margin: 0 0 1rem 0;
      color: #0f0;
      text-shadow: 0 0 8px #0f0;
    }

    .info-panel .ai-whisper {
      font-style: italic;
      margin-bottom: 1rem;
      opacity: 0.8;
      border-left: 2px solid #0f0;
      padding-left: 1rem;
    }

    .info-panel .detail {
      margin-bottom: 0.8rem;
    }

    .info-panel .detail strong {
      color: #0f0;
      display: block;
      margin-bottom: 0.2rem;
      font-weight: 700;
    }

    .info-panel .detail p {
      margin: 0;
      opacity: 0.9;
      line-height: 1.5;
    }

    .info-panel .narrative {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
    }
    .info-panel .narrative p {
      line-height: 1.6;
      opacity: 0.9;
    }
    .info-panel .narrative strong {
      color: #fff; /* Brighter for emphasis */
      font-weight: 700;
      display: inline; /* override block default */
    }
    .info-panel .narrative em {
      color: #fff;
      font-style: italic;
    }

    .host-star-info {
      background: rgba(0, 255, 0, 0.05);
      border: 1px solid rgba(0, 255, 0, 0.2);
      padding: 1rem;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      border-radius: 4px;
    }

    .host-star-info strong {
      display: block;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      color: #0f0;
      letter-spacing: 0.05em;
    }

    .host-star-info .star-type {
      display: block;
      opacity: 0.8;
      margin-bottom: 1rem;
      font-size: 1rem;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      padding-bottom: 0.75rem;
    }

    .star-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .stat-item .label {
      font-size: 0.8rem;
      opacity: 0.7;
      text-transform: uppercase;
    }

    .stat-item .value {
      font-size: 1.3rem;
      font-weight: 700;
      text-shadow: 0 0 4px #0f0;
    }

    .info-panel .assessment-value {
      font-size: 1.2rem;
      font-weight: bold;
      padding: 0.2rem 0.5rem;
      display: inline-block;
    }
    .assessment-habitable {
      color: #44ff44;
    }
    .assessment-potentially-habitable {
      color: #ffff44;
    }
    .assessment-unlikely {
      color: #ff4444;
    }

    .citations {
      margin-top: 1.5rem;
      font-size: 0.8rem;
    }
    .citations strong {
      color: #0f0;
    }
    .citations ul {
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0 0;
    }
    .citations a {
      color: #0f0;
      text-decoration: none;
      opacity: 0.8;
    }
    .citations a:hover {
      opacity: 1;
      text-decoration: underline;
    }

    .methodology-visual {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
    }
    .methodology-visual p {
      margin: 0.2rem 0 0.5rem 0;
      opacity: 0.9;
    }
    .methodology-visual svg {
      width: 100%;
      height: 80px;
      background: rgba(0, 255, 0, 0.05);
      border-radius: 4px;
      border: 1px solid rgba(0, 255, 0, 0.1);
    }
    .methodology-visual text {
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.7;
    }
    .light-curve-path {
      stroke: #0f0;
      stroke-width: 1.5;
      fill: none;
    }
    .wobble-path {
      stroke: url(#wobble-gradient);
      stroke-width: 2;
      fill: none;
    }
    .star-dot {
      fill: #0f0;
      opacity: 0.6;
    }

    .structure-analysis {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
    }

    .scanning-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 255, 0, 0),
        rgba(0, 255, 0, 0.05) 2px,
        rgba(0, 255, 0, 0) 4px
      );
      animation: scan 2s linear infinite;
      pointer-events: none;
      opacity: 0.5;
    }
    @keyframes scan {
      0% {
        background-position: 0 0;
      }
      100% {
        background-position: 0 100px;
      }
    }

    .factoid-carousel {
      position: absolute;
      bottom: 8rem;
      right: 2rem;
      width: 300px;
      max-width: 80vw;
      background: rgba(0, 20, 0, 0.85);
      border: 1px solid #0f0;
      color: #0f0;
      text-shadow: 0 0 5px #0f0;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
      pointer-events: none;
    }

    .factoid-carousel.visible {
      opacity: 1;
      transform: translateY(0);
      pointer-events: all;
    }

    .factoid-header {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.7;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      padding-bottom: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .factoid-content {
      flex-grow: 1;
      min-height: 70px; /* Give it a consistent height */
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .factoid-content p {
      margin: 0;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .typing-cursor {
      animation: blink 1s steps(1) infinite;
    }

    @keyframes blink {
      50% {
        opacity: 0;
      }
    }

    .factoid-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
    }

    .factoid-controls button {
      background: transparent;
      border: 1px solid #0f0;
      color: #0f0;
      cursor: pointer;
      width: 30px;
      height: 30px;
      padding: 0;
      font-family: 'Orbitron', sans-serif;
      transition: background 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .factoid-controls button:hover {
      background: rgba(0, 255, 0, 0.2);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  protected firstUpdated() {
    this.initThree();
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('pointermove', this.onCanvasPointerMove);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopFactoidCarousel();
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    window.removeEventListener('resize', this.handleResize);
    this.canvas?.removeEventListener('click', this.onCanvasClick);
    this.canvas?.removeEventListener('pointermove', this.onCanvasPointerMove);
    cancelAnimationFrame(this.animationFrameId);
    this.renderer?.dispose();
  }

  protected updated(
    changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>,
  ): void {
    if (
      changedProperties.has('galaxiesData') ||
      changedProperties.has('viewMode') ||
      changedProperties.has('currentGalaxyId')
    ) {
      this.updateScene();
    }
    if (
      changedProperties.has('selectedPlanetId') ||
      changedProperties.has('viewMode')
    ) {
      this.updateTarget();

      if (this.viewMode === 'planets' && this.currentGalaxyId) {
        const currentGalaxy = this.galaxiesData.find(
          (g) => g.id === this.currentGalaxyId,
        );
        this.selectedPlanetData =
          currentGalaxy?.planets.get(this.selectedPlanetId!) || null;
      } else {
        this.selectedPlanetData = null;
      }

      // Reset and trigger analysis for new planet
      this.structureAnalysis = null;
      this.isAnalyzingStructure = false;
      if (
        this.selectedPlanetData &&
        !this.selectedPlanetData.planetType.toLowerCase().includes('gas giant')
      ) {
        this.analyzeStructure();
      }

      this.currentFactoidIndex = 0;
      this.stopFactoidCarousel();
      if (this.typingTimeout) clearTimeout(this.typingTimeout);
      if (this.selectedPlanetData?.factoids?.length) {
        this.startFactoidCarousel();
        this.typeFactoid(
          this.selectedPlanetData.factoids[this.currentFactoidIndex],
        );
      }
    }
  }

  private async analyzeStructure() {
    if (!this.selectedPlanetData) return;
    this.isAnalyzingStructure = true;

    const prompt = `You are AXEE, an AI specialized in advanced vehicle design and structural analysis for deep space exploration. The following data represents a structural model for a component of a next-generation spacecraft, likely for atmospheric flight on a newly discovered exoplanet. Analyze the provided data and generate a concise technical summary in markdown format.

Your analysis should include:
- **Component Identification:** What is the component's likely function (e.g., control surface, wing, support pylon)?
- **Material Analysis:** A brief summary of the materials used and their key properties (e.g., density, elasticity).
- **Structural Assessment:** An overview of the design, highlighting key features, node distribution, or potential stress points.
- **Integrity Verdict:** A one-sentence final assessment of its suitability for its presumed purpose.

**Do not just repeat the data back. Provide a synthesized analysis.**

Data:
\`\`\`
${STRUCTURE_DATA}
\`\`\`
`;
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      this.structureAnalysis = response.text;
    } catch (e) {
      console.error('Structural analysis failed:', e);
      this.structureAnalysis = 'Error: Could not complete structural analysis.';
    } finally {
      this.isAnalyzingStructure = false;
    }
  }

  private startFactoidCarousel() {
    this.stopFactoidCarousel();
    this.factoidInterval = window.setInterval(() => {
      this.cycleFactoid(1);
    }, 7000);
  }

  private stopFactoidCarousel() {
    if (this.factoidInterval) {
      clearInterval(this.factoidInterval);
      this.factoidInterval = null;
    }
  }

  private cycleFactoid(direction: 1 | -1) {
    if (!this.selectedPlanetData?.factoids?.length) return;
    const numFactoids = this.selectedPlanetData.factoids.length;
    this.currentFactoidIndex =
      (this.currentFactoidIndex + direction + numFactoids) % numFactoids;
    const newFactoid =
      this.selectedPlanetData.factoids[this.currentFactoidIndex];
    this.typeFactoid(newFactoid);
  }

  private handleManualCycle(direction: 1 | -1) {
    this.cycleFactoid(direction);
    this.startFactoidCarousel();
  }

  private typeFactoid(text: string) {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    this.displayedFactoidText = '';
    let i = 0;
    const typingSpeed = 30; // ms per character

    const type = () => {
      if (i < text.length) {
        this.displayedFactoidText += text.charAt(i);
        i++;
        this.typingTimeout = window.setTimeout(type, typingSpeed);
      }
    };
    type();
  }

  private createGalaxyVisual(
    galaxy: GalaxyData,
    isDetailView: boolean,
  ): THREE.Group {
    const galaxyGroup = new THREE.Group();
    let spinRate = 0;
    let shaderSpinRate = 0;

    const parameters = {
      count: 0,
      size: isDetailView ? 0.015 : 0.03, // Sharper points for detail, larger for overview
      radius: isDetailView ? 20 : 5, // Larger radius for focused view
      branches: 0,
      spin: 0,
      randomness: 0.5,
      randomnessPower: 3.0,
      insideColor: galaxy.visualization.insideColor,
      outsideColor: galaxy.visualization.outsideColor,
      isBarred: false,
      diskFactorY: 1.0,
      ellipticalFactorX: 1.0,
      isIrregular: false,
      numClumps: 1,
      centralDensityPower: 2.0,
    };

    // Dynamically adjust parameters based on view mode for complexity and performance.
    switch (galaxy.type.toLowerCase().trim()) {
      case 'spiral':
        parameters.count = isDetailView ? 150000 : 20000;
        parameters.branches = isDetailView ? 5 : 3; // Fewer, fuzzier arms in overview
        parameters.spin = isDetailView ? 1.2 : 0.8;
        parameters.randomness = isDetailView ? 0.4 : 0.8;
        parameters.diskFactorY = 0.2;
        spinRate = 0.0008 + Math.random() * 0.0007;
        shaderSpinRate = 0.1;
        break;
      case 'barred spiral':
        parameters.count = isDetailView ? 160000 : 22000;
        parameters.branches = 2; // Defined by 2 main arms
        parameters.spin = isDetailView ? 1.2 : 0.9;
        parameters.randomness = isDetailView ? 0.3 : 0.7;
        parameters.isBarred = true;
        parameters.diskFactorY = 0.2;
        spinRate = 0.0008 + Math.random() * 0.0007;
        shaderSpinRate = 0.1;
        break;
      case 'elliptical':
        parameters.count = isDetailView ? 180000 : 30000;
        parameters.randomness = 1.0;
        parameters.randomnessPower = 2.0;
        parameters.ellipticalFactorX = isDetailView ? 1.5 : 1.2;
        parameters.diskFactorY = isDetailView ? 0.7 : 0.9;
        parameters.centralDensityPower = isDetailView ? 2.5 : 2.0;
        spinRate = 0.0001 + Math.random() * 0.0001;
        break;
      case 'lenticular':
        parameters.count = isDetailView ? 170000 : 25000;
        parameters.randomness = isDetailView ? 0.2 : 0.5;
        parameters.randomnessPower = 2.5;
        parameters.diskFactorY = isDetailView ? 0.1 : 0.3; // Thicker disk in overview
        parameters.centralDensityPower = isDetailView ? 2.2 : 2.0;
        spinRate = 0.0003 + Math.random() * 0.0003;
        break;
      case 'irregular':
      default:
        parameters.count = isDetailView ? 100000 : 15000;
        parameters.randomness = 1.5;
        parameters.randomnessPower = 1.5;
        parameters.isIrregular = true;
        parameters.numClumps = isDetailView ? 5 : 3; // Fewer clumps in overview
        spinRate = 0;
        break;
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);
    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    const clumpCenters: THREE.Vector3[] = [];
    if (parameters.isIrregular) {
      for (let i = 0; i < parameters.numClumps; i++) {
        clumpCenters.push(
          new THREE.Vector3(
            (Math.random() - 0.5) * parameters.radius * 0.7,
            (Math.random() - 0.5) * parameters.radius * 0.3,
            (Math.random() - 0.5) * parameters.radius * 0.7,
          ),
        );
      }
    }

    for (let i = 0; i < parameters.count; i++) {
      const i3 = i * 3;
      const radius =
        Math.pow(Math.random(), parameters.centralDensityPower) *
        parameters.radius;
      const pos = new THREE.Vector3();

      if (parameters.branches > 0) {
        const spinAngle = radius * parameters.spin;
        const branchAngle =
          ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
        pos.x = Math.cos(branchAngle + spinAngle) * radius;
        pos.z = Math.sin(branchAngle + spinAngle) * radius;
        if (parameters.isBarred && radius < parameters.radius * 0.5) {
          pos.x *= 3.0;
          pos.z *= 0.4;
        }
      } else {
        const spherical = new THREE.Spherical(
          radius,
          Math.acos(1 - 2 * Math.random()),
          Math.random() * 2 * Math.PI,
        );
        pos.setFromSpherical(spherical);
      }

      const randomX =
        Math.pow(Math.random(), parameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        parameters.randomness *
        radius *
        0.5;
      const randomY =
        Math.pow(Math.random(), parameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        parameters.randomness *
        radius *
        0.5;
      const randomZ =
        Math.pow(Math.random(), parameters.randomnessPower) *
        (Math.random() < 0.5 ? 1 : -1) *
        parameters.randomness *
        radius *
        0.5;
      pos.add(new THREE.Vector3(randomX, randomY, randomZ));

      if (parameters.isIrregular) {
        const clumpIndex = i % parameters.numClumps;
        pos.multiplyScalar(0.5).add(clumpCenters[clumpIndex]);
      }

      pos.x *= parameters.ellipticalFactorX;
      pos.y *= parameters.diskFactorY;

      positions[i3] = pos.x;
      positions[i3 + 1] = pos.y;
      positions[i3 + 2] = pos.z;

      const colorRadius = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2);
      const maxRadius =
        parameters.radius *
        Math.max(parameters.ellipticalFactorX, 1.0, 1.0 / parameters.diskFactorY);
      const mixedColor = colorInside.clone();
      const lerpFactor = Math.pow(colorRadius / maxRadius, 0.7); // Enhance core brightness
      mixedColor.lerp(colorOutside, lerpFactor);
      colors[i3] = mixedColor.r;
      colors[i3 + 1] = mixedColor.g;
      colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0.0},
        uSize: {value: parameters.size},
        uSpinRate: {value: shaderSpinRate},
      },
      vertexShader: galaxyVs,
      fragmentShader: galaxyFs,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    material.userData.isGalaxyPointsMaterial = true;

    const points = new THREE.Points(geometry, material);
    points.name = 'galaxyPoints';
    galaxyGroup.add(points);
    galaxyGroup.userData.spin = spinRate;
    return galaxyGroup;
  }

  private createStarfield() {
    const starCount = 50000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const scales = new Float32Array(starCount);

    const color = new THREE.Color();
    const range = 1000;

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * range * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * range * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * range * 2;
      const randomLightness = 0.5 + Math.random() * 0.5;
      const hue = Math.random() > 0.5 ? 0.6 : 0.1;
      const saturation = Math.random() * 0.1;
      color.setHSL(hue, saturation, randomLightness);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      scales[i] = Math.pow(1.0 - Math.random(), 3.0) * 2.0 + 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    this.starfieldMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {value: 0.0},
      },
      vertexShader: starfieldVs,
      fragmentShader: starfieldFs,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    this.starfield = new THREE.Points(geometry, this.starfieldMaterial);
    this.scene.add(this.starfield);
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      2000,
    );
    this.camera.position.set(0, 50, 150);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
    this.controls.addEventListener('start', () => {
      this.isManualControl = true;
    });

    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.8,
      0.4,
      0.1,
    );
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    this.createStarfield();
    this.scene.add(this.galaxyGroup);

    this.runAnimationLoop();
    this.updateScene();
  }

  private handleResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.composer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private runAnimationLoop = () => {
    this.animationFrameId = requestAnimationFrame(this.runAnimationLoop);
    const elapsedTime = this.clock.getElapsedTime();

    if (!this.isManualControl) {
      this.camera.position.lerp(this.targetPosition, 0.05);
      this.controls.target.lerp(this.targetLookAt, 0.05);
    }
    this.controls.update();

    // Add a slow drift to the starfield for a sense of movement
    if (this.starfield) {
      this.starfield.rotation.y += 0.00005;
      this.starfield.rotation.x += 0.00002;
    }

    // Rotate main galaxy in planet view
    const galaxyPoints = this.galaxyGroup.getObjectByName('galaxyPoints');
    if (galaxyPoints) {
      galaxyPoints.rotation.y += this.galaxyGroup.userData.spin || 0;
    }

    // Rotate overview galaxies in galaxy view
    this.galaxyRenderObjects.forEach((group) => {
      const galaxyVisual = group.children[0];
      if (galaxyVisual) {
        galaxyVisual.rotation.y += group.userData.spin || 0;
      }
    });

    // Update time uniforms for shaders
    if (this.starfieldMaterial) {
      this.starfieldMaterial.uniforms.uTime.value = elapsedTime;
    }

    this.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Points &&
        obj.material instanceof THREE.ShaderMaterial &&
        obj.material.userData.isGalaxyPointsMaterial
      ) {
        obj.material.uniforms.uTime.value = elapsedTime;
      }
    });

    // Animate planets
    this.planetGroups.forEach((group, id) => {
      const planetMesh = group.getObjectByName('planet') as THREE.Mesh;
      const atmosphereMesh = group.getObjectByName('atmosphere') as THREE.Mesh;
      const ringMesh = group.getObjectByName('ring') as THREE.Mesh;
      const isHovered = id === this.hoveredObjectId;

      // Hover effect
      const targetScale = isHovered ? 1.05 : 1.0;
      group.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1,
      );

      // Add self-rotation to planets, atmospheres, and rings
      if (planetMesh) {
        planetMesh.rotation.y += 0.001;
        if (planetMesh.material instanceof THREE.ShaderMaterial) {
          planetMesh.material.uniforms.uTime.value = elapsedTime;
        }
      }
      if (atmosphereMesh) {
        // Slower rotation for atmosphere creates parallax
        atmosphereMesh.rotation.y += 0.0008;
        if (atmosphereMesh.material instanceof THREE.ShaderMaterial) {
          atmosphereMesh.material.uniforms.uTime.value = elapsedTime;
        }
      }
      if (ringMesh) {
        // Rings rotate along their own Z axis due to their tilt
        ringMesh.rotation.z -= 0.0005;
      }
    });

    this.composer.render();
  };

  private createRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1;
    canvas.height = 128;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(0.8, 'rgba(255,255,255,0.5)');
    gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return new THREE.CanvasTexture(canvas);
  }

  private clearSceneContent(isPlanetView: boolean) {
    if (isPlanetView) {
      this.planetGroups.forEach((group) => this.galaxyGroup.remove(group));
      this.planetGroups.clear();
      const orbits = this.galaxyGroup.children.filter(
        (c) => c.name === 'orbit',
      );
      orbits.forEach((o) => this.galaxyGroup.remove(o));
    } else {
      this.galaxyRenderObjects.forEach((group) => this.scene.remove(group));
      this.galaxyRenderObjects.clear();
    }
  }

  private updateScene() {
    this.galaxyGroup.visible = this.viewMode === 'planets';
    if (this.viewMode === 'galaxies') {
      this.clearSceneContent(true);
      this.updateGalaxiesView();
    } else {
      this.clearSceneContent(false);
      this.updatePlanetsView();
    }
  }

  private updateGalaxiesView() {
    this.galaxiesData.forEach((galaxy, index) => {
      if (!this.galaxyRenderObjects.has(galaxy.id)) {
        const containerGroup = new THREE.Group();
        const galaxyVisual = this.createGalaxyVisual(galaxy, false);
        galaxyVisual.children.forEach(
          (c) => (c.userData = {id: galaxy.id, name: galaxy.name}),
        );
        containerGroup.add(galaxyVisual);
        containerGroup.userData.spin = galaxyVisual.userData.spin;

        const angle = (index / 8) * Math.PI * 2;
        const radius = 40 + (index % 8) * 10;
        containerGroup.position.set(
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * 10,
          Math.sin(angle) * radius,
        );
        this.galaxyRenderObjects.set(galaxy.id, containerGroup);
        this.scene.add(containerGroup);
      }
    });
  }

  private updatePlanetsView() {
    const currentGalaxy = this.galaxiesData.find(
      (g) => g.id === this.currentGalaxyId,
    );
    if (!currentGalaxy) {
      this.clearSceneContent(true);
      return;
    }

    if (this.galaxyGroup.userData.id !== currentGalaxy.id) {
      this.galaxyGroup.clear();
      const galaxyVisual = this.createGalaxyVisual(currentGalaxy, true);
      this.galaxyGroup.userData = {
        id: currentGalaxy.id,
        spin: galaxyVisual.userData.spin,
      };
      while (galaxyVisual.children.length > 0) {
        this.galaxyGroup.add(galaxyVisual.children[0]);
      }
    }

    const planetsData = Array.from(currentGalaxy.planets.values());
    planetsData.forEach((planet, index) => {
      if (!this.planetGroups.has(planet.celestial_body_id)) {
        const planetGroup = new THREE.Group();
        const geometry = new THREE.SphereGeometry(2, 64, 64);
        const textureTypeMap: {[key: string]: number} = {
          TERRESTRIAL: 1,
          GAS_GIANT: 2,
          VOLCANIC: 3,
          ICY: 1,
        };
        const material = new THREE.ShaderMaterial({
          vertexShader: planetVs,
          fragmentShader: planetFs,
          uniforms: {
            uTime: {value: 0.0},
            uColor1: {value: new THREE.Color(planet.visualization.color1)},
            uColor2: {value: new THREE.Color(planet.visualization.color2)},
            uOceanColor: {
              value: new THREE.Color(planet.visualization.oceanColor),
            },
            uCloudiness: {value: planet.visualization.cloudiness},
            uIceCoverage: {value: planet.visualization.iceCoverage},
            uTextureType: {
              value:
                textureTypeMap[planet.visualization.surfaceTexture] || 1,
            },
          },
        });
        const sphereMesh = new THREE.Mesh(geometry, material);
        sphereMesh.name = 'planet';
        sphereMesh.userData = {
          id: planet.celestial_body_id,
          name: planet.planetName,
        };
        planetGroup.add(sphereMesh);

        const atmosphereGeometry = new THREE.SphereGeometry(2.1, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
          vertexShader: atmosphereVs,
          fragmentShader: atmosphereFs,
          uniforms: {
            uAtmosphereColor: {
              value: new THREE.Color(planet.visualization.atmosphereColor),
            },
            uTime: {value: 0.0},
          },
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
          transparent: true,
        });
        const atmosphereMesh = new THREE.Mesh(
          atmosphereGeometry,
          atmosphereMaterial,
        );
        atmosphereMesh.name = 'atmosphere';
        planetGroup.add(atmosphereMesh);

        if (planet.visualization.hasRings) {
          const ringGeometry = new THREE.RingGeometry(2.8, 4.5, 64);
          const ringMaterial = new THREE.MeshBasicMaterial({
            map: this.createRingTexture(),
            color: planet.visualization.atmosphereColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
          });
          const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
          ringMesh.rotation.x = Math.PI / 2 - 0.2;
          ringMesh.name = 'ring';
          planetGroup.add(ringMesh);
        }

        const angle = (index / 8) * Math.PI * 2;
        const radius = 25 + index * 8;
        planetGroup.position.set(
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius,
        );
        const orbitGeometry = new THREE.RingGeometry(
          radius - 0.05,
          radius + 0.05,
          128,
        );
        const orbitMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.2,
        });
        const orbitMesh = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbitMesh.rotation.x = Math.PI / 2;
        orbitMesh.name = 'orbit';
        this.galaxyGroup.add(orbitMesh);
        this.planetGroups.set(planet.celestial_body_id, planetGroup);
        this.galaxyGroup.add(planetGroup);
      }
    });
  }

  private updateTarget() {
    this.isManualControl = false;
    if (this.viewMode === 'galaxies') {
      this.targetPosition.set(0, 50, 150);
      this.targetLookAt.set(0, 0, 0);
    } else {
      if (this.selectedPlanetId) {
        const group = this.planetGroups.get(this.selectedPlanetId);
        if (group) {
          const worldPosition = new THREE.Vector3();
          group.getWorldPosition(worldPosition);
          this.targetPosition
            .copy(worldPosition)
            .add(new THREE.Vector3(0, 2, 8));
          this.targetLookAt.copy(worldPosition);
        }
      } else {
        this.targetPosition.set(0, 0, 40);
        this.targetLookAt.set(0, 0, 0);
      }
    }
  }

  private onCanvasPointerMove = (event: PointerEvent) => {
    this.pointer.x = (event.clientX / this.canvas.clientWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / this.canvas.clientHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    let hovering = false;
    this.hoveredObjectId = null;

    const objectsToTest =
      this.viewMode === 'galaxies'
        ? Array.from(this.galaxyRenderObjects.values())
        : Array.from(this.planetGroups.values());

    const intersects = this.raycaster.intersectObjects(objectsToTest, true);
    if (intersects.length > 0) {
      const {userData} = intersects[0].object;
      if (userData.id && userData.name) {
        this.hoveredObjectId = userData.id;
        hovering = true;
        this.hoverLabel = {
          text: userData.name,
          x: event.clientX,
          y: event.clientY,
          visible: true,
        };
      }
    }
    if (!hovering) {
      this.hoverLabel = {...this.hoverLabel, visible: false};
    }
    this.canvas.style.cursor = hovering ? 'pointer' : 'grab';
  };

  private onCanvasClick = () => {
    if (this.hoveredObjectId) {
      const eventName =
        this.viewMode === 'galaxies'
          ? 'galaxy-selected'
          : 'planet-selected';
      const detailKey =
        this.viewMode === 'galaxies' ? 'galaxyId' : 'planetId';
      this.dispatchEvent(
        new CustomEvent(eventName, {
          detail: {[detailKey]: this.hoveredObjectId},
          bubbles: true,
          composed: true,
        }),
      );
    }
  };

  private parseMarkdown(text: string): string {
    if (!text) return '';

    const escapeHTML = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // Split by markdown delimiters, capturing them so they are not lost
    const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return tokens
      .map((token) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          // Bold: slice off the markers and escape the inner content
          return `<strong>${escapeHTML(token.slice(2, -2))}</strong>`;
        }
        if (token.startsWith('*') && token.endsWith('*')) {
          // Italic: slice off the markers and escape the inner content
          return `<em>${escapeHTML(token.slice(1, -1))}</em>`;
        }
        // Just text, escape it completely
        return escapeHTML(token);
      })
      .join('');
  }

  private renderMethodologyVisual(planet: PlanetData) {
    const methodology = planet.discoveryMethodology.toLowerCase();

    // Prioritize transit as it's a specific visual
    if (methodology.includes('transit')) {
      return html`
        <div class="methodology-visual">
          <strong>Discovery Method</strong>
          <p>Transit Photometry</p>
          <svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet">
            <path d="M 10 40 H 190" class="light-curve-path" />
            <path
              d="M 80 40 C 90 40, 95 25, 100 25 S 110 40, 120 40"
              class="light-curve-path"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-90 0"
                to="90 0"
                dur="5s"
                repeatCount="indefinite"
              />
            </path>
            <text
              x="100"
              y="70"
              font-family="Orbitron, sans-serif"
              font-size="8"
              fill="#0f0"
              text-anchor="middle"
            >
              STELLAR FLUX
            </text>
          </svg>
        </div>
      `;
    }

    if (methodology.includes('radial velocity')) {
      return html`
        <div class="methodology-visual">
          <strong>Discovery Method</strong>
          <p>Radial Velocity</p>
          <svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient
                id="wobble-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" style="stop-color:#4444ff;" />
                <stop offset="50%" style="stop-color:#0f0;" />
                <stop offset="100%" style="stop-color:#ff4444;" />
              </linearGradient>
            </defs>
            <path class="wobble-path">
              <animate
                attributeName="d"
                values="M 10 40 Q 50 10, 100 40 T 190 40; M 10 40 Q 50 70, 100 40 T 190 40; M 10 40 Q 50 10, 100 40 T 190 40"
                dur="4s"
                repeatCount="indefinite"
              />
            </path>
            <text
              x="35"
              y="15"
              font-family="Orbitron, sans-serif"
              font-size="8"
              fill="#44f"
              text-anchor="middle"
            >
              BLUESHIFT
            </text>
            <text
              x="165"
              y="65"
              font-family="Orbitron, sans-serif"
              font-size="8"
              fill="#f44"
              text-anchor="middle"
            >
              REDSHIFT
            </text>
          </svg>
        </div>
      `;
    }

    if (methodology.includes('kepler') || methodology.includes('tess')) {
      const stars = Array.from({length: 80}).map(() => ({
        cx: Math.random() * 200,
        cy: Math.random() * 60,
        r: Math.random() * 0.7 + 0.2,
      }));
      return html`
        <div class="methodology-visual">
          <strong>Discovery Method</strong>
          <p>Photometric Data Analysis</p>
          <svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet">
            ${stars.map(
              (s) =>
                html`<circle cx=${s.cx} cy=${s.cy} r=${s.r} class="star-dot" />`,
            )}
            <rect x="0" y="0" width="2" height="60" fill="rgba(0, 255, 0, 0.7)">
              <animate
                attributeName="x"
                from="-2"
                to="200"
                dur="6s"
                repeatCount="indefinite"
              />
            </rect>
            <text
              x="100"
              y="70"
              font-family="Orbitron, sans-serif"
              font-size="8"
              fill="#0f0"
              text-anchor="middle"
            >
              ANALYZING LIGHT CURVES
            </text>
          </svg>
        </div>
      `;
    }

    // Fallback for other methodologies
    return html`
      <div class="detail">
        <strong>Discovery Methodology:</strong>
        <p>${planet.discoveryMethodology}</p>
      </div>
    `;
  }

  private renderStructureAnalysis() {
    if (
      this.selectedPlanetData?.planetType.toLowerCase().includes('gas giant')
    ) {
      return nothing;
    }

    return html`
      <div class="structure-analysis detail">
        <strong>Structural Integrity Analysis</strong>
        ${this.isAnalyzingStructure
          ? html`<p>Analyzing component telemetry...</p>`
          : this.structureAnalysis
          ? html`<div class="narrative">
              ${unsafeHTML(this.parseMarkdown(this.structureAnalysis))}
            </div>`
          : html`<p>Awaiting analysis...</p>`}
      </div>
    `;
  }

  private renderFactoidCarousel() {
    const factoids = this.selectedPlanetData?.factoids;
    if (!factoids?.length) {
      return nothing;
    }

    const leftArrow = html`<svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
    >
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
    </svg>`;
    const rightArrow = html`<svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
    >
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
    </svg>`;

    return html`
      <div class="factoid-carousel ${this.selectedPlanetData ? 'visible' : ''}">
        <div class="factoid-header">CELESTIAL ARCHIVES</div>
        <div class="factoid-content">
          <p>${this.displayedFactoidText}<span class="typing-cursor">_</span></p>
        </div>
        <div class="factoid-controls">
          <button
            @click=${() => this.handleManualCycle(-1)}
            title="Previous Factoid"
            aria-label="Previous Factoid"
          >
            ${leftArrow}
          </button>
          <span>${this.currentFactoidIndex + 1} / ${factoids.length}</span>
          <button
            @click=${() => this.handleManualCycle(1)}
            title="Next Factoid"
            aria-label="Next Factoid"
          >
            ${rightArrow}
          </button>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <canvas id="three-canvas"></canvas>
      ${this.hoverLabel.visible
        ? html`<div
            class="hover-label"
            style="left: ${this.hoverLabel.x}px; top: ${this.hoverLabel.y}px;"
          >
            ${this.hoverLabel.text}
          </div>`
        : nothing}
      ${this.isScanning ? html`<div class="scanning-overlay"></div>` : nothing}
      <div class="info-panel ${this.selectedPlanetData ? 'visible' : ''}">
        ${this.selectedPlanetData
          ? html`
              <h2>${this.selectedPlanetData.planetName}</h2>
              <p class="ai-whisper">
                "${this.selectedPlanetData.aiWhisper}"
              </p>
              <div class="host-star-info">
                <strong>${this.selectedPlanetData.hostStar.name}</strong>
                <span class="star-type"
                  >${this.selectedPlanetData.hostStar.type}</span
                >
                <div class="star-stats">
                  <div class="stat-item">
                    <span class="label">Temperature</span>
                    <span class="value"
                      >${this.selectedPlanetData.hostStar.temperatureKelvin.toLocaleString()}
                      K</span
                    >
                  </div>
                  <div class="stat-item">
                    <span class="label">Luminosity</span>
                    <span class="value"
                      >${this.selectedPlanetData.hostStar.luminositySuns} &times;
                      Sol</span
                    >
                  </div>
                </div>
              </div>
              <div class="detail">
                <strong>Planet Type:</strong>
                <p>${this.selectedPlanetData.planetType}</p>
              </div>
              <div class="detail">
                <strong>Atmosphere:</strong>
                <p>${this.selectedPlanetData.atmosphericComposition}</p>
              </div>
              <div class="detail">
                <strong>Surface:</strong>
                <p>${this.selectedPlanetData.surfaceFeatures}</p>
              </div>
              <div class="detail">
                <strong>Moons:</strong>
                <p>
                  ${this.selectedPlanetData.moons.count === 0
                    ? 'None detected'
                    : `${this.selectedPlanetData.moons.count} known ${
                        this.selectedPlanetData.moons.count === 1
                          ? 'moon'
                          : 'moons'
                      }${
                        this.selectedPlanetData.moons.names.length > 0
                          ? `: ${this.selectedPlanetData.moons.names.join(
                              ', ',
                            )}`
                          : ''
                      }`}
                </p>
              </div>
              <div class="detail">
                <strong>Potential for Life</strong>
                <p
                  class="assessment-value assessment-${this.selectedPlanetData.potentialForLife.assessment
                    .toLowerCase()
                    .replace(' ', '-')}"
                >
                  ${this.selectedPlanetData.potentialForLife.assessment}
                </p>
              </div>
              <div class="detail narrative">
                <strong>Discovery Narrative</strong>
                <p>
                  ${unsafeHTML(
                    this.parseMarkdown(
                      this.selectedPlanetData.discoveryNarrative,
                    ),
                  )}
                </p>
              </div>
              ${this.renderMethodologyVisual(this.selectedPlanetData)}
              ${this.renderStructureAnalysis()}
              ${this.groundingChunks.length > 0
                ? html` <div class="citations">
                    <strong>Data Sources:</strong>
                    <ul>
                      ${this.groundingChunks.map((chunk) =>
                        chunk.web?.uri
                          ? html` <li>
                              <a
                                href=${chunk.web.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                >${chunk.web.title || chunk.web.uri}</a
                              >
                            </li>`
                          : nothing,
                      )}
                    </ul>
                  </div>`
                : nothing}
            `
          : nothing}
      </div>
      ${this.renderFactoidCarousel()}
    `;
  }
}
