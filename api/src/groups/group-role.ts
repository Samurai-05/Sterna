/**
 * A membership's role, mirroring group_members_role_check in
 * InitialSchema1787734644000. There are exactly two, and no plan for a third:
 * the owner created the group and can rename or delete it, everyone else is a
 * member.
 */
export enum GroupRole {
  Owner = 'owner',
  Member = 'member',
}
