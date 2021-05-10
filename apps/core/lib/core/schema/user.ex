defmodule Core.Schema.User do
  use Piazza.Ecto.Schema, derive_json: false
  use Arc.Ecto.Schema
  alias Core.Schema.{
    Address,
    Publisher,
    Webhook,
    Account,
    Group,
    RoleBinding,
    Incident,
    UpgradeQueue,
    ImpersonationPolicy
  }

  @email_re ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-\.]+\.[a-zA-Z]{2,}$/

  schema "users" do
    field :name,            :string
    field :email,           :string
    field :password_hash,   :string
    field :password,        :string, virtual: true
    field :jwt,             :string, virtual: true
    field :external,        :boolean, virtual: true, default: false
    field :service_account, :boolean, default: false
    field :avatar_id,       :binary_id
    field :avatar,          Core.Storage.Type
    field :customer_id,     :string
    field :phone,           :string

    embeds_one :address, Address, on_replace: :update

    belongs_to :account, Account
    belongs_to :queue, UpgradeQueue, foreign_key: :default_queue_id

    has_one :publisher,  Publisher, foreign_key: :owner_id
    has_one :impersonation_policy, ImpersonationPolicy, on_replace: :delete

    has_many :webhooks,  Webhook
    has_many :role_bindings, RoleBinding
    many_to_many :groups, Group, join_through: "group_members"
    has_many :group_role_bindings, through: [:groups, :role_bindings]

    timestamps()
  end

  def service_account(query \\ __MODULE__, is_svc \\ :yes)

  def service_account(query, :yes) do
    from(u in query, where: u.service_account)
  end

  def service_account(query, _) do
    from(u in query, where: not u.service_account)
  end

  def roles(%__MODULE__{role_bindings: roles, group_role_bindings: group_roles})
    when is_list(roles) and is_list(group_roles) do
    Enum.map(roles ++ group_roles, & &1.role)
    |> Enum.uniq_by(& &1.id)
  end
  def roles(_), do: []

  def search(query \\ __MODULE__, name) do
    from(u in query, where: like(u.name, ^"#{name}%") or like(u.email, ^"#{name}%"))
  end

  def for_account(query \\ __MODULE__, account_id) do
    from(u in query, where: u.account_id == ^account_id)
  end

  def without_account(query \\ __MODULE__) do
    from(u in query, where: is_nil(u.account_id))
  end

  def for_incident(query \\ __MODULE__, %Incident{creator: %{account_id: id1}, owner: %{account_id: id2}}) do
    from(u in query, where: u.account_id in ^[id1, id2])
  end

  def ordered(query \\ __MODULE__, order \\ [asc: :name]),
    do: from(p in query, order_by: ^order)

  @valid ~w(name email password phone)a

  def changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @valid)
    |> cast_embed(:address)
    |> unique_constraint(:email)
    |> validate_required([:name, :email])
    |> validate_length(:email,    max: 255)
    |> validate_length(:name,     max: 255)
    |> validate_length(:password, min: 10)
    |> validate_format(:email, @email_re)
    |> hash_password()
    |> generate_uuid(:avatar_id)
    |> cast_attachments(attrs, [:avatar], allow_urls: true)
  end

  def service_account_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, [:name])
    |> cast_assoc(:impersonation_policy)
    |> add_email(model)
    |> validate_length(:email,    max: 255)
    |> validate_length(:name,     max: 255)
    |> validate_length(:password, min: 10)
    |> validate_format(:email, @email_re)
    |> unique_constraint(:email)
    |> validate_required([:name, :email])
    |> hash_password()
  end

  defp add_email(changeset, %__MODULE__{email: nil}) do
    name = get_field(changeset, :name)
    changeset
    |> put_change(:email, "#{srv_acct_name(name)}@srv.plural.sh")
    |> put_change(:password, srv_acct_pwd())
  end
  defp add_email(changeset, _), do: changeset

  defp srv_acct_name(name) do
    name
    |> String.downcase()
    |> String.replace(" ", ".")
  end

  defp srv_acct_pwd() do
    :crypto.strong_rand_bytes(64)
    |> Base.url_encode64()
  end

  @stripe_valid ~w(customer_id)a

  def stripe_changeset(model, attrs \\ %{}) do
    model
    |> cast(attrs, @stripe_valid)
    |> unique_constraint(:customer_id)
  end

  defp hash_password(%Ecto.Changeset{valid?: true, changes: %{password: password}} = changeset) do
    change(changeset, Argon2.add_hash(password))
  end
  defp hash_password(changeset), do: changeset
end

defimpl Jason.Encoder, for: Core.Schema.User do
  @ignore ~w(password password_hash jwt)a

  def encode(struct, opts) do
    Piazza.Ecto.Schema.mapify(struct)
    |> Map.drop(@ignore)
    |> Jason.Encode.map(opts)
  end
end
