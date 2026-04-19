import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { getInviteCount, getInviteLeaderboard, resetInvites } from "../../utils/invites.js";

export default {
  data: new SlashCommandBuilder()
    .setName("invites")
    .setDescription("Invite tracking commands")
    .addSubcommand((s) =>
      s.setName("check")
        .setDescription("Check how many users a member has invited")
        .addUserOption((o) =>
          o.setName("user").setDescription("User to check (leave blank for yourself)").setRequired(false)
        )
    )
    .addSubcommand((s) =>
      s.setName("leaderboard")
        .setDescription("See the top inviters in this server")
    )
    .addSubcommand((s) =>
      s.setName("reset")
        .setDescription("Reset a member's invite count (Admin only)")
        .addUserOption((o) =>
          o.setName("user").setDescription("User to reset").setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction, _client: Client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    if (sub === "check") {
      const target = interaction.options.getUser("user") ?? interaction.user;
      const inv = getInviteCount(guild.id, target.id);

      // Also fetch server invites created by this user
      let activeInvites = 0;
      try {
        const allInvites = await guild.invites.fetch();
        activeInvites = allInvites.filter((i) => i.inviter?.id === target.id).size;
      } catch {}

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📨 ${target.tag}'s Invites`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
              { name: "✅ Total Joined", value: `**${inv.total}**`, inline: true },
              { name: "🔗 Active Invites", value: `**${activeInvites}**`, inline: true },
              { name: "❌ Fake/Left", value: `**${inv.fake + inv.left}**`, inline: true },
            )
            .setDescription(
              inv.total === 0
                ? `**${target.tag}** hasn't invited anyone yet.`
                : `**${target.tag}** has invited **${inv.total}** member(s) to this server!`,
            )
            .setFooter({ text: `Invite tracking auto-logs on member join` })
            .setTimestamp(),
        ],
      });
    } else if (sub === "leaderboard") {
      const lb = getInviteLeaderboard(guild.id);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("📨 Invite Leaderboard")
            .setDescription(
              lb.length > 0
                ? lb.map((e, i) => `**${i + 1}.** <@${e.userId}> — **${e.total}** invite${e.total !== 1 ? "s" : ""}`).join("\n")
                : "No invite data yet.",
            )
            .setFooter({ text: `Top ${lb.length} inviters` })
            .setTimestamp(),
        ],
      });
    } else if (sub === "reset") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "❌ Administrator permission required.", ephemeral: true });
      }
      const target = interaction.options.getUser("user", true);
      resetInvites(guild.id, target.id);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("✅ Invites Reset")
            .setDescription(`**${target.tag}**'s invite count has been reset to 0.`),
        ],
      });
    }
  },
};
