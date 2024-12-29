import { useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid';
import useWASD from "use-wasd";

type CurrentMax = { current: number; max: number }

type Stats = {
	level: number
	health: CurrentMax
	speed: number
	radius: number
	attack: {
		damage: number
		cooldown: CurrentMax
		range: number
		radius: number
		projectileSpeed: number
	}
}

const DEFAULT_STATS: Stats = {
	level: 1,
	health: { current: 1, max: 1 },
	speed: .25,
	radius: 48,
	attack: {
		damage: 1,
		cooldown: { current: 0, max: 100 },
		range: 30,
		radius: 10,
		projectileSpeed: 3
	}
}

type Entity = {
	uuid: string
	name: string
	stats: Stats
	x: number
	y: number
	face: "left" | "right"
}

const entity = (name: string, x: number, y: number, stats: Stats = structuredClone(DEFAULT_STATS)): Entity => {
	return {
		uuid: uuidv4(),
		name,
		stats,
		x,
		y,
		face: "right"
	}
}

type Projectile = {
	uuid: string
	caster: string
	startX: number, startY: number
	x: number, y: number
	damage: number
	angle: number
	speed: number
	radius: number
	range: number
	isPiercing: boolean
	entityHitCooldown: Record<string, number>
}

const projectile = (caster: string, x: number, y: number, damage: number, angle: number, speed: number, radius: number, range: number, isPiercing: boolean = false): Projectile => {
	return {
		uuid: uuidv4(),
		caster,
		startX: x, startY: y,
		x, y,
		damage,
		angle,
		speed,
		radius,
		range,
		isPiercing,
		entityHitCooldown: {}
	}
}

type GroundItem = {
	uuid: string
	type: "xp" | "health" | "item" | "coin"
	value: string | number
	x: number, y: number
}

const groundItem = (type: "xp" | "health" | "item" | "coin", value: string | number, x: number, y: number): GroundItem => {
	return {
		uuid: uuidv4(),
		type,
		value,
		x, y
	}
}

type Upgrade = {
	id: string
	name: string
	description: string
	rarity: "common" | "rare" | "unique"
	maxLevel?: number
	values?: Record<string, number>
}

type ProgressiveValue = {
	initialValue: number
	increment: number
}

const UPGRADES: Upgrade[] = [
	{
		id: "attackRadius",
		name: "Attack Radius",
		description: "Increase the attack radius by {radius}",
		rarity: "common",
		values: {
			radius: 8
		}
	},
	{
		id: "movementSpeed",
		name: "Movement Speed",
		description: "Increase the movement speed by {speed}",
		rarity: "common",
		values: {
			speed: 25
		}
	},
	{
		id: "health",
		name: "Health",
		description: "Increase the health by {health}",
		rarity: "common",
		values: {
			health: 10
		}
	},
	{
		id: "attackDamage",
		name: "Attack Damage",
		description: "Increase the attack damage by {damage}",
		rarity: "common",
		values: {
			damage: 1
		}
	},
	{
		id: "attackSpeed",
		name: "Attack Speed",
		description: "Decrease the attack cooldown by {speed}",
		rarity: "common",
		maxLevel: 20,
		values: {
			speed: 5
		}
	},
	{
		id: "piercing",
		name: "Piercing",
		description: "Projectiles pierce through enemies",
		rarity: "unique",
	},
	{
		id: "lifeSteal",
		name: "Life Steal",
		description: "Heals {health} health per attack",
		rarity: "rare",
		values: {
			health: 1
		}
	}
]

type Sprite = {
	image: HTMLImageElement
	width: number
	height: number
	frameCount: number
}

const sprite = (src: string, width: number, height: number, frameCount: number): Sprite => {
	const image = new Image();
	image.src = src;
	return {
		image,
		width,
		height,
		frameCount
	}
}

const getUpgradeById = (id: string): Upgrade | undefined => UPGRADES.find((upgrade) => upgrade.id === id);

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

function App() {
	const [enemies, setEnemies] = useState<Entity[]>([]);
	const [projectiles, setProjectiles] = useState<Projectile[]>([]);
	const [groundItems, setGroundItems] = useState<GroundItem[]>([]);
	const [upgrades, setUpgrades] = useState<Record<string, number>>({});

	const [player, setPlayer] = useState<Entity>(entity('player', 0, 0, {
		level: 1,
		health: { current: 10, max: 10 },
		speed: 1,
		radius: 48,
		attack: {
			damage: 1,
			cooldown: { current: 0, max: 105 },
			range: 200,
			radius: 16,
			projectileSpeed: 2
		}
	}));

	const [sprites, setSprites] = useState<Record<string, Sprite>>({
		"player_idle": sprite("player_idle.png", 24, 24, 2),
		"player_move": sprite("player_move.png", 24, 24, 6),
		"skeleton": sprite("skeleton.png", 150, 150, 4),
		"goblin": sprite("goblin.png", 150, 150, 8),
		"eye": sprite("eye.png", 150, 150, 8),
		"mushroom": sprite("mushroom.png", 150, 150, 8),
		"fruit": sprite("fruit.png", 48, 48, 1),
		"gem": sprite("gem.png", 48, 48, 1),
		"arrow": sprite("arrow.png", 48, 48, 1)
	});

	const playerWithUpgrades = useMemo(() => {
		const newPlayer = structuredClone(player);

		for (const [upgradeId, level] of Object.entries(upgrades)) {
			const upgrade = getUpgradeById(upgradeId);
			if (!upgrade) continue;

			const values = upgrade.values as Record<string, number>;

			switch (upgradeId) {
				case "attackRadius":
					newPlayer.stats.attack.radius += values.radius * level;
					break;
				case "movementSpeed":
					newPlayer.stats.speed += values.speed * level / 100;
					break;
				case "health":
					newPlayer.stats.health.max += values.health * level;
					break;
				case "attackDamage":
					newPlayer.stats.attack.damage += values.damage * level;
					break;
				case "attackSpeed":
					newPlayer.stats.attack.cooldown.max -= values.speed * level;
					break;
			}
		}

		return newPlayer;
	}, [upgrades])

	const [xp, setXp] = useState(0);
	const getMaxXp = () => player.stats.level * 10;

	const [tick, setTick] = useState(0);
	const [mouse, setMouse] = useState({ x: 0, y: 0 });
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [upgradeSelection, setUpgradeSelection] = useState<string[]>([]);

	const getEnemyByUUID = (uuid: string): Entity | undefined => enemies.find((enemy) => enemy.uuid === uuid);

	// Angle between screen center and mouse
	const playerAngle = useMemo(
		() => Math.atan2(mouse.y - window.innerHeight / 2, mouse.x - window.innerWidth / 2),
		[mouse]
	);

	const { w, a, s, d, z } = useWASD({
		allowed: ["w", "a", "s", "d", "e", "z"],
	});

	useEffect(() => {
		if (upgradeSelection.length) return;

		const hasUpgrade = (id: string) => upgrades[id] > 0;

		const newPlayer: Entity = { ...player };
		const newEnemies: Entity[] = [...enemies];
		const newProjectiles: Projectile[] = [...projectiles];
		const newGroundItems: GroundItem[] = [...groundItems];

		// Controls
		if (w) {
			newPlayer.y -= playerWithUpgrades.stats.speed;
		}
		if (a) {
			newPlayer.x -= playerWithUpgrades.stats.speed;
		}
		if (s) {
			newPlayer.y += playerWithUpgrades.stats.speed;
		}
		if (d) {
			newPlayer.x += playerWithUpgrades.stats.speed;
		}

		// Player auto attack
		if (newPlayer.stats.attack.cooldown.current === 0) {
			newProjectiles.push(projectile(
				player.uuid,
				newPlayer.x + playerWithUpgrades.stats.radius * Math.cos(playerAngle),
				newPlayer.y + playerWithUpgrades.stats.radius * Math.sin(playerAngle),
				playerWithUpgrades.stats.attack.damage,
				playerAngle,
				playerWithUpgrades.stats.attack.projectileSpeed,
				playerWithUpgrades.stats.attack.radius,
				playerWithUpgrades.stats.attack.range,
				hasUpgrade("piercing"),
			));

			newPlayer.stats.attack.cooldown.current = playerWithUpgrades.stats.attack.cooldown.max;
		}
		else {
			newPlayer.stats.attack.cooldown.current--;
		}

		// Process projectiles
		for (let i = 0; i < newProjectiles.length; i++) {
			const projectile = newProjectiles[i];

			projectile.x += Math.cos(projectile.angle) * projectile.speed;
			projectile.y += Math.sin(projectile.angle) * projectile.speed;

			// Reduce entityHitCooldown
			for (const [uuid, cooldown] of Object.entries(projectile.entityHitCooldown)) {
				if (cooldown > 0) {
					projectile.entityHitCooldown[uuid] = cooldown - 1;
				}
			}

			if (projectile.caster === player.uuid) {
				// Damage enemies
				let continueLoop = false;
				for (let j = 0; j < newEnemies.length; j++) {
					const enemy = newEnemies[j];
					const distance = Math.sqrt(Math.pow(projectile.x - enemy.x, 2) + Math.pow(projectile.y - enemy.y, 2));

					const processHit = () => {
						enemy.stats.health.current -= projectile.damage;
						if (hasUpgrade("lifeSteal")) {
							newPlayer.stats.health.current += 1;
						}
					}

					if (distance <= enemy.stats.radius + projectile.radius) {
						if (projectile.isPiercing) {
							if (projectile.entityHitCooldown[enemy.uuid] === 0 || projectile.entityHitCooldown[enemy.uuid] === undefined) {
								processHit();
								projectile.entityHitCooldown[enemy.uuid] = 300;
							}
						}
						else {
							processHit();
							newProjectiles.splice(i, 1);
							i--;
							continueLoop = true;
							break;
						}
					}
				}
				if (continueLoop) continue;
			}
			else {
				// Damage player
				const distance = Math.sqrt(Math.pow(projectile.x - newPlayer.x, 2) + Math.pow(projectile.y - newPlayer.y, 2));
				if (distance <= playerWithUpgrades.stats.radius + projectile.radius) {
					newPlayer.stats.health.current -= 1;
					newProjectiles.splice(i, 1);
					i--;
					continue;
				}
			}

			// Remove projectile if out of range
			const distance = Math.sqrt(Math.pow(projectile.x - projectile.startX, 2) + Math.pow(projectile.y - projectile.startY, 2));
			if (distance >= projectile.range) {
				newProjectiles.splice(i, 1);
				i--;
				continue;
			}
		}

		// Process enemies
		for (let i = 0; i < newEnemies.length; i++) {
			const enemy = newEnemies[i];

			// Remove enemy if dead
			if (enemy.stats.health.current <= 0) {
				newEnemies.splice(i, 1);
				i--;
				// Drop XP or Health
				if (Math.random() < 0.95) {
					newGroundItems.push(groundItem("xp", 4 + enemy.stats.level, enemy.x, enemy.y));
				}
				else {
					newGroundItems.push(groundItem("health", enemy.stats.level, enemy.x, enemy.y));
				}
				continue;
			}

			const angle = Math.atan2(newPlayer.y - enemy.y, newPlayer.x - enemy.x);
			const distance = Math.sqrt(Math.pow(newPlayer.x - enemy.x, 2) + Math.pow(newPlayer.y - enemy.y, 2)) - playerWithUpgrades.stats.radius - enemy.stats.radius;

			// Chase player if not in attack range
			if (distance > enemy.stats.attack.range) {
				const deltaX = Math.cos(angle) * enemy.stats.speed;
				enemy.x += deltaX;
				enemy.y += Math.sin(angle) * enemy.stats.speed;
				enemy.face = deltaX > 0 ? "right" : "left";
			}
			else {
				// Shoot projectile towards player
				if (enemy.stats.attack.cooldown.current === 0) {
					newProjectiles.push(projectile(
						enemy.uuid,
						enemy.x + enemy.stats.radius * Math.cos(angle),
						enemy.y + enemy.stats.radius * Math.sin(angle),
						enemy.stats.attack.damage,
						angle,
						enemy.stats.attack.projectileSpeed,
						enemy.stats.attack.radius,
						enemy.stats.attack.range
					));

					enemy.stats.attack.cooldown.current = enemy.stats.attack.cooldown.max;
				}
				else {
					enemy.stats.attack.cooldown.current--;
				}
			}
		}

		// Process ground items
		for (let i = 0; i < newGroundItems.length; i++) {
			const groundItem = newGroundItems[i];
			const distance = Math.sqrt(Math.pow(newPlayer.x - groundItem.x, 2) + Math.pow(newPlayer.y - groundItem.y, 2));

			if (groundItem.type === "xp") {
				if (distance <= 150 - playerWithUpgrades.stats.radius) {
					const angle = Math.atan2(newPlayer.y - groundItem.y, newPlayer.x - groundItem.x);
					groundItem.x += Math.cos(angle) * 2;
					groundItem.y += Math.sin(angle) * 2;

					if (distance <= playerWithUpgrades.stats.radius) {
						setXp((xp) => xp + (groundItem.value as number));
						newGroundItems.splice(i, 1);
						i--;
					}
				}
			}
			else if (groundItem.type === "health") {
				if (distance <= playerWithUpgrades.stats.radius) {
					newPlayer.stats.health.current += (groundItem.value as number) * 2;
					newGroundItems.splice(i, 1);
					i--;
				}
			}
		}

		// Spawn enemies
		if (tick % 100 === 0) {
			const randomAngle = Math.random() * 2 * Math.PI;
			
			const level = Math.max(1, player.stats.level + rand(-1, 1));
			const names = ["skeleton", "goblin", "eye", "mushroom"]
			const name = names[Math.floor(level / 4) % names.length];

			newEnemies.push({
				uuid: uuidv4(),
				name,
				stats: {
					level,
					health: { current: 1 + Math.floor(level / 4), max: 1 + Math.floor(level / 4) },
					speed: .25 + .02 * level,
					radius: 48 + Math.floor(level / 16) * 16,
					attack: {
						damage: 1 + Math.floor(level / 4),
						cooldown: { current: 0, max: 100 },
						range: 30 + Math.floor(level / 4) * 4,
						radius: 10 + Math.floor(level / 4) * 2,
						projectileSpeed: 3
					}
				},
				x: newPlayer.x + Math.sin(randomAngle) * 600,
				y: newPlayer.y + Math.cos(randomAngle) * 600,
				face: "right"
			});
		}

		// Fixes
		newPlayer.stats.health.current = Math.min(newPlayer.stats.health.current, playerWithUpgrades.stats.health.max);

		setPlayer(newPlayer);
		setEnemies(newEnemies);
		setProjectiles(newProjectiles);
		setGroundItems(newGroundItems);

		// roate player face on mouse.x
		setPlayer((player) => {
			return { ...player, face: mouse.x > window.innerWidth / 2 ? "right" : "left" };
		})
	}, [tick]);

	useEffect(() => {
		const enemies = [];

		for (let i = 0; i < 10; i++) {
			const randomAngle = Math.random() * 2 * Math.PI;
			enemies.push(entity(
				'skeleton',
				player.x + Math.sin(randomAngle) * 600,
				player.y + Math.cos(randomAngle) * 600
			));
		}
		setEnemies(enemies);

		const intervalId = setInterval(() => {
			setTick((tick) => tick + 1);
		}, 1000 / 60);

		const handleMouseMove = (event: MouseEvent) => {
			setMouse({ x: event.clientX, y: event.clientY });
		};
		window.addEventListener('mousemove', handleMouseMove);

		return () => {
			clearInterval(intervalId)
			window.removeEventListener('mousemove', handleMouseMove)
		};
	}, [])

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.imageSmoothingEnabled = false;

		const drawSprite = (sprite: Sprite, x: number, y: number, radius: number, angle: number = 0) => {
			const size = radius * 2;

			if (z) {
				ctx.beginPath();
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.strokeStyle = 'hsl(30deg, 50%, 50%, 1)';
				ctx.stroke();
			}

			// Save the current context state
			ctx.save();
			ctx.translate(x, y);

			if (angle) {
				ctx.rotate(angle + Math.PI * 0.75);
			}

			// Draw the image, adjusting for the rotation
			ctx.drawImage(
				sprite.image,
				-size / 2, // Center the image on the rotation point
				-size / 2,
				size,
				size
			);

			// Restore the context state
			ctx.restore();
		};


		const drawEntitySprite = (sprite: Sprite, x: number, y: number, animationSpeed: number, frameOffset: number, radius: number, flip: boolean = false, scale: number = 1) => {
			ctx.save();

			if (z) {
				ctx.beginPath();
				ctx.arc(x, y, radius, 0, Math.PI * 2);
				ctx.strokeStyle = 'hsl(30deg, 50%, 50%, 1)';
				ctx.stroke();
			}

			const gradient = ctx.createRadialGradient(x, y + radius, radius * 0.2, x, y + radius, radius * 0.8);
			gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
			gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.ellipse(x, y + radius, radius * 0.8, 20, 0, 0, Math.PI * 2);
			ctx.fill();

			// Determine the player's image and current frame
			const currentFrame = Math.floor(tick / animationSpeed + frameOffset) % sprite.frameCount;
			const size = radius * 2;

			ctx.translate(x, y);   // Move the origin to the center of the player
			ctx.scale(flip ? -scale : scale, scale);                 // Flip horizontally
			ctx.translate(-x, -y); // Restore the origin

			ctx.drawImage(
				sprite.image,
				sprite.width * currentFrame,
				0,
				sprite.width,
				sprite.height,
				x - size / 2,
				y - size / 2,
				size,
				size
			);

			ctx.restore();
		}

		const render = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Center coordinates
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;

			// Draw ground items
			groundItems.forEach((item) => {
				const x = centerX + item.x - player.x;
				const y = centerY + item.y - player.y;

				if (item.type === "xp") {
					drawSprite(
						sprites['gem'],
						x, y, 16
					)
				}
				else if (item.type === "health") {
					drawSprite(
						sprites['fruit'],
						x, y, 16
					)
				}
			})

			// Draw player
			drawEntitySprite(
				w || a || s || d ? sprites['player_move'] : sprites['player_idle'],
				centerX, centerY,
				10, 0,
				playerWithUpgrades.stats.radius,
				player.face === "left"
			);

			function hash(str: string) {
				return [...str.substring(0, 4)].reduce((hash, char) => hash + char.charCodeAt(0), 0);
			}

			// Draw enemies
			enemies.sort((a, b) => a.y - b.y).forEach((enemy) => {
				const x = centerX + enemy.x - player.x;
				const y = centerY + enemy.y - player.y;

				drawEntitySprite(
					sprites[enemy.name],
					x, y,
					12, hash(enemy.uuid),
					enemy.stats.radius,
					x > centerX,
					2.8
				);

				if (z) {
					// display name
					ctx.fillStyle = 'white';
					ctx.font = '12px sans-serif';
					ctx.textAlign = 'center';
					ctx.fillText(enemy.name + " Lv." + enemy.stats.level, x, y - 15);
					// hp
					ctx.fillText(enemy.stats.health.current + "/" + enemy.stats.health.max, x, y - 5);
				}
			});

			// Draw projectiles
			projectiles.forEach((proj) => {
				const x = centerX + proj.x - player.x;
				const y = centerY + proj.y - player.y;

				drawSprite(
					sprites['arrow'],
					x, y, proj.radius, proj.angle
				)
			});
		};

		render();
	}, [tick]);

	// XP
	useEffect(() => {
		if (xp >= getMaxXp()) {
			// Level up
			setPlayer((player) => {
				return { ...player, stats: { ...player.stats, level: player.stats.level + 1 } };
			});
			setXp(0);

			// Get N random non-repeating upgrades
			const getRandomUpgrades = (amount: number) => {
				const randomUpgrades: string[] = [];

				const availableUpgrades = UPGRADES.filter((upgrade: Upgrade) => {
					if (upgrade.rarity === "unique") return !upgrades[upgrade.id] && Math.random() < 0.1;
					if (upgrade.rarity === "rare") return Math.random() < 0.5;
					return !upgrades[upgrade.id] || !upgrade.maxLevel || upgrades[upgrade.id] < upgrade.maxLevel;
				});

				while (randomUpgrades.length < amount) {
					const upgrade = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
					if (!randomUpgrades.includes(upgrade.id)) {
						randomUpgrades.push(upgrade.id);
					}
				}

				return randomUpgrades;
			}

			setUpgradeSelection(getRandomUpgrades(3));
		}
	}, [xp]);

	const selectUpgrade = (id: string) => {
		setUpgrades((upgrades) => {
			return { ...upgrades, [id]: (upgrades[id] || 0) + 1 };
		});

		setUpgradeSelection([]);
	}

	return (
		<div className='game' style={{ "--background-offset-x": -player.x + "px", "--background-offset-y": -player.y + "px" } as React.CSSProperties}>
			<div className="ui">

				<div className="health">
					<div className="health__bar" style={{ "--progress": `${(player.stats.health.current / playerWithUpgrades.stats.health.max) * 100}%` } as React.CSSProperties}></div>
				</div>
				{upgradeSelection.length > 0 && <div className='upgrade-selection'>{upgradeSelection.map((upgradeId, index) => {
					const upgrade = getUpgradeById(upgradeId);
					if (!upgrade) return null;

					// Replace "{variable}" with upgrade.values[variable]
					const description = upgrade.description.replace(/{(.*?)}/g, (_, variable) => `<span class="value">${upgrade.values && upgrade.values[variable] || ""}</span>`);
					const level = upgrades[upgrade.id] || 0;

					return (
						<div key={upgrade.id} className={`upgrade ${upgrade.rarity}`} onClick={() => selectUpgrade(upgrade.id)} style={{ "--index": index } as React.CSSProperties}>
							<div className='upgrade__name'>{upgrade.name} Lv.{level + 1}</div>
							<img src={`./upgrade/${upgrade.id}.gif`} />
							<div className='upgrade__description'>
								<span dangerouslySetInnerHTML={{ __html: description }}></span>
							</div>
						</div>
					)
				})}</div>}
				<div className="info">
					{/* <div>Player {player.x}, {player.y}, {tick / 100}</div> */}
					<div>HP: {player.stats.health.current}/{playerWithUpgrades.stats.health.max}</div>
				</div>
				<div className="upgrade-list">{Object.entries(upgrades).map(([id, level]) => {
					// const upgrade = getUpgradeById(id);
					// if (!upgrade) return null;

					return (
						<div className='upgrade' key={id} style={{ backgroundImage: `url(./upgrade/${id}.gif)` }}>
							<div className='upgrade__level'>{level}</div>
						</div>
					)
				})}</div>
				<div className='xp' style={{ "--progress": `${(xp / getMaxXp()) * 100}%` } as React.CSSProperties}>
					<div className="xp__bar"></div>
					<div className="xp__text">Level: {player.stats.level} ({xp}/{getMaxXp()})</div>
				</div>
			</div>
			<canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight}></canvas>
		</div>
	)
}

export default App
